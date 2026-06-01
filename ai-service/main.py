"""
AirWatch AI Service — FastAPI v2.1
Multi-output regression (pm25, temperature, humidity, pressure, uv)
+ Weather label classification (rainy / sunny / normal)
Training data: data_train/_combined_balanced.csv

Endpoints:
  GET  /health          — health check + csv/db status
  GET  /model/status    — training status, row counts, accuracy
  POST /train           — (re)train both models from CSV (background)
  GET  /predict         — next N step predictions (5 metrics + weather label)

Bug-fixes vs v2.0:
  - [BUG1] data_source field added to PredictResponse (was causing Pydantic ValidationError)
  - [BUG2] Classifier proba alignment via clf.classes_ mapping (was crashing when not all
           labels present in a training subset)
  - [BUG3] classifier_accuracy & window keys added to initial _model_state dict
  - [BUG4] Model saved/loaded via joblib so restart doesn't require re-training
  - [PERF] n_jobs=1 on training (avoids OOM on small cloud instances)
"""

import csv
import joblib
import math
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Config ─────────────────────────────────────────────────────────────────────
# Support env overrides for cloud deployment (Koyeb volume mounts, etc.)
_csv_env = os.environ.get("CSV_PATH")
COMBINED_CSV = Path(_csv_env) if _csv_env else (Path(__file__).parent.parent / "data_train" / "_combined_balanced.csv")

_model_env = os.environ.get("MODEL_PATH")
MODEL_DIR = Path(_model_env) if _model_env else (Path(__file__).parent / "models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = os.environ.get(
    "DB_PATH",
    str(Path(__file__).parent.parent / "frontend" / "data" / "aqi.db"),
)

WINDOW_SIZE = 12          # look-back window (rows) for feature engineering
FORECAST_HORIZON = 6      # default steps to predict
MIN_ROWS_FOR_TRAINING = 200

FEATURE_COLS = ["pm25", "temperature", "humidity", "pressure", "uv"]
LABEL_COL = "weather_label"
# Fixed ordering — MUST match label_map below
WEATHER_LABELS = ["normal", "rainy", "sunny"]

# ── Global model state ─────────────────────────────────────────────────────────
_model_lock = threading.Lock()
_model_state: dict = {
    "regressor": None,
    "classifier": None,
    "scaler": None,
    "label_encoder": None,      # int → str
    "label_decoder": None,      # str → int
    "trained_at": None,
    "csv_rows": 0,
    "window": WINDOW_SIZE,
    "classifier_accuracy": None,
    "last_error": None,
    "training_in_progress": False,
}

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AirWatch AI Service",
    description="Multi-output regression + weather classification for air quality",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# ═══════════════════════════════════════════════════════════════════════════════
# Startup: load persisted model if available
# ═══════════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
def _load_persisted_model():
    """Load previously trained model from disk on startup (avoids re-training every restart)."""
    reg_path = MODEL_DIR / "regressor.joblib"
    clf_path = MODEL_DIR / "classifier.joblib"
    scaler_path = MODEL_DIR / "scaler.joblib"
    meta_path = MODEL_DIR / "meta.joblib"

    if reg_path.exists() and clf_path.exists() and scaler_path.exists() and meta_path.exists():
        try:
            reg = joblib.load(reg_path)
            clf = joblib.load(clf_path)
            scaler = joblib.load(scaler_path)
            meta = joblib.load(meta_path)
            with _model_lock:
                _model_state.update({
                    "regressor": reg,
                    "classifier": clf,
                    "scaler": scaler,
                    "label_encoder": meta["label_encoder"],
                    "label_decoder": meta["label_decoder"],
                    "trained_at": meta["trained_at"],
                    "csv_rows": meta["csv_rows"],
                    "window": meta["window"],
                    "classifier_accuracy": meta.get("classifier_accuracy"),
                    "last_error": None,
                })
            print(f"[startup] Loaded persisted model trained at {meta['trained_at']}")
        except Exception as exc:
            print(f"[startup] Could not load persisted model: {exc}")


# ═══════════════════════════════════════════════════════════════════════════════
# Data loading
# ═══════════════════════════════════════════════════════════════════════════════

def _parse_time_features(date_str: str, time_str: str) -> tuple[float, float, float, float]:
    """
    Parse date/time strings → cyclic (sin/cos) features for time-of-day and day-of-week.
    Returns: (hour_sin, hour_cos, dow_sin, dow_cos)
    Falls back to zeros on parse error.
    """
    try:
        dt = datetime.strptime(f"{date_str} {time_str}", "%d/%m/%Y %H:%M:%S")
        h = dt.hour + dt.minute / 60.0
        d = dt.weekday()  # 0=Mon … 6=Sun
        return (
            math.sin(2 * math.pi * h / 24),
            math.cos(2 * math.pi * h / 24),
            math.sin(2 * math.pi * d / 7),
            math.cos(2 * math.pi * d / 7),
        )
    except Exception:
        return 0.0, 0.0, 0.0, 0.0


def load_csv_data() -> tuple[np.ndarray, np.ndarray]:
    """
    Load and preprocess all CSV training data.

    Returns:
        features:  ndarray (N, 9)  — [pm25, temp, hum, pres, uv, h_sin, h_cos, d_sin, d_cos]
        labels:    ndarray (N,)    — int-encoded weather_label
    """
    if not COMBINED_CSV.exists():
        raise FileNotFoundError(f"Training CSV not found: {COMBINED_CSV}")

    label_map = {lbl: i for i, lbl in enumerate(WEATHER_LABELS)}
    features_list: list[list[float]] = []
    labels_list: list[int] = []
    skipped = 0

    with open(COMBINED_CSV, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                vals = [float(row[c]) for c in FEATURE_COLS]
                h_sin, h_cos, d_sin, d_cos = _parse_time_features(
                    row["date"], row["time"]
                )
                features_list.append(vals + [h_sin, h_cos, d_sin, d_cos])
                raw_lbl = row[LABEL_COL].strip().lower()
                labels_list.append(label_map.get(raw_lbl, 0))
            except (ValueError, KeyError):
                skipped += 1
                continue

    if len(features_list) < MIN_ROWS_FOR_TRAINING:
        raise ValueError(
            f"Too few valid rows: {len(features_list)} "
            f"(need ≥ {MIN_ROWS_FOR_TRAINING}, skipped {skipped} malformed)"
        )

    features = np.array(features_list, dtype=np.float32)
    labels = np.array(labels_list, dtype=np.int32)
    return features, labels


# ═══════════════════════════════════════════════════════════════════════════════
# Feature engineering: sliding-window flat features
# ═══════════════════════════════════════════════════════════════════════════════

def _build_windows(
    features_scaled: np.ndarray,
    labels: np.ndarray,
    W: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Build flat sliding-window dataset for RF.

    For index i (W ≤ i < N):
        X[i]     = flatten(features_scaled[i-W : i])   → shape (W * 9,)
        y_reg[i] = features_scaled[i, :5]              → shape (5,)  next sensor values
        y_cls[i] = labels[i]                           → int label for next step

    Returns: X (N-W, W*9), y_reg (N-W, 5), y_cls (N-W,)
    """
    N = len(features_scaled)
    X, y_reg, y_cls = [], [], []
    for i in range(W, N):
        X.append(features_scaled[i - W : i].flatten())
        y_reg.append(features_scaled[i, :5])
        y_cls.append(labels[i])
    return (
        np.array(X, dtype=np.float32),
        np.array(y_reg, dtype=np.float32),
        np.array(y_cls, dtype=np.int32),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Training
# ═══════════════════════════════════════════════════════════════════════════════

def _do_train():
    """Background task: train regressor + classifier from CSV, then persist to disk."""
    with _model_lock:
        _model_state["training_in_progress"] = True
        _model_state["last_error"] = None

    try:
        from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
        from sklearn.multioutput import MultiOutputRegressor
        from sklearn.preprocessing import MinMaxScaler

        # ── 1. Load CSV ────────────────────────────────────────────────────────
        print("[train] Loading CSV data …")
        features, labels = load_csv_data()
        N = len(features)
        print(f"[train] {N} valid rows loaded")

        # ── 2. Scale features ──────────────────────────────────────────────────
        scaler = MinMaxScaler()
        features_scaled = scaler.fit_transform(features)   # (N, 9)

        # ── 3. Build sliding-window dataset ────────────────────────────────────
        W = WINDOW_SIZE
        X, y_reg, y_cls = _build_windows(features_scaled, labels, W)
        print(f"[train] Windows: X={X.shape}, y_reg={y_reg.shape}, y_cls={y_cls.shape}")

        if len(X) < 50:
            raise ValueError(
                f"Too few training windows ({len(X)}). "
                f"Need at least {W + 50} rows."
            )

        # ── 4. Train Multi-output Regressor ───────────────────────────────────
        # n_jobs=1 to avoid OOM on memory-constrained cloud instances.
        # 100 trees, depth 12 → good accuracy on 23k-row dataset.
        print("[train] Training regressor …")
        base_rf = RandomForestRegressor(
            n_estimators=100,
            max_depth=12,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=1,           # RAM-safe: no parallel jobs
        )
        regressor = MultiOutputRegressor(base_rf, n_jobs=1)
        regressor.fit(X, y_reg)
        print("[train] Regressor done")

        # ── 5. Train Classifier ───────────────────────────────────────────────
        print("[train] Training classifier …")
        classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=1,           # RAM-safe
            class_weight="balanced",
        )
        classifier.fit(X, y_cls)
        print(f"[train] Classifier done. classes_={classifier.classes_}")

        # ── 6. In-sample accuracy (classifier) ────────────────────────────────
        cls_acc = float(np.mean(classifier.predict(X) == y_cls))
        print(f"[train] Classifier in-sample accuracy: {cls_acc:.4f}")

        # ── 7. Build label encoder/decoder ────────────────────────────────────
        # Use classifier.classes_ as ground truth for the proba index mapping.
        # [BUG2 FIX] classifier.classes_ may not contain all labels if some
        # are absent from the training split. We always decode via classes_,
        # not via the fixed WEATHER_LABELS order.
        label_encoder = {int(c): WEATHER_LABELS[int(c)] for c in classifier.classes_}
        label_decoder = {WEATHER_LABELS[int(c)]: int(c) for c in classifier.classes_}

        # ── 8. Persist to disk ─────────────────────────────────────────────────
        trained_at = datetime.now(timezone.utc).isoformat()
        meta = {
            "label_encoder": label_encoder,
            "label_decoder": label_decoder,
            "trained_at": trained_at,
            "csv_rows": N,
            "window": W,
            "classifier_accuracy": round(cls_acc, 4),
        }
        joblib.dump(regressor,  MODEL_DIR / "regressor.joblib",  compress=3)
        joblib.dump(classifier, MODEL_DIR / "classifier.joblib", compress=3)
        joblib.dump(scaler,     MODEL_DIR / "scaler.joblib",     compress=3)
        joblib.dump(meta,       MODEL_DIR / "meta.joblib",       compress=3)
        print(f"[train] Models saved to {MODEL_DIR}")

        with _model_lock:
            _model_state.update({
                "regressor": regressor,
                "classifier": classifier,
                "scaler": scaler,
                "label_encoder": label_encoder,
                "label_decoder": label_decoder,
                "trained_at": trained_at,
                "csv_rows": N,
                "window": W,
                "classifier_accuracy": round(cls_acc, 4),
                "last_error": None,
                "training_in_progress": False,
            })

    except ImportError as exc:
        msg = f"Missing dependency: {exc}. Run: pip install scikit-learn joblib numpy"
        print(f"[train] ERROR: {msg}")
        with _model_lock:
            _model_state["last_error"] = msg
            _model_state["training_in_progress"] = False
    except Exception as exc:
        print(f"[train] ERROR: {exc}")
        with _model_lock:
            _model_state["last_error"] = str(exc)
            _model_state["training_in_progress"] = False


# ═══════════════════════════════════════════════════════════════════════════════
# Inference helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _pm25_to_aqi(pm25: float) -> tuple[int, str]:
    """US-EPA breakpoint table: PM2.5 (µg/m³) → (AQI int, level string)."""
    bp = [
        (0.0,   12.0,   0,   50, "Good"),
        (12.1,  35.4,   51,  100, "Moderate"),
        (35.5,  55.4,  101,  150, "Unhealthy for Sensitive Groups"),
        (55.5,  150.4, 151,  200, "Unhealthy"),
        (150.5, 250.4, 201,  300, "Very Unhealthy"),
        (250.5, 500.4, 301,  500, "Hazardous"),
    ]
    p = round(pm25 * 10) / 10
    for c_lo, c_hi, i_lo, i_hi, level in bp:
        if c_lo <= p <= c_hi:
            return round(((i_hi - i_lo) / (c_hi - c_lo)) * (p - c_lo) + i_lo), level
    return 500, "Hazardous"


def _ema_single(series: list[float], alpha: float = 0.3) -> float:
    """Compute exponential moving average of series, return final smoothed value."""
    if not series:
        return 0.0
    ema = series[0]
    for v in series[1:]:
        ema = alpha * v + (1 - alpha) * ema
    return ema


def _ema_forecast_multi(recent_rows: list[dict], steps: int) -> list[dict]:
    """
    Fallback EMA forecast when model is not trained.
    Predicts each of the 5 metrics independently via EMA + small drift.
    weather_label defaults to 'normal' with low confidence (0.34).
    """
    series: dict[str, list[float]] = {c: [] for c in FEATURE_COLS}
    for r in recent_rows:
        for c in FEATURE_COLS:
            try:
                series[c].append(float(r[c]))
            except (KeyError, ValueError):
                series[c].append(0.0)

    ema_vals = {c: _ema_single(series[c]) for c in FEATURE_COLS}
    drift = {
        c: (series[c][-1] - series[c][0]) / max(len(series[c]), 1) * 0.1
        if len(series[c]) > 1 else 0.0
        for c in FEATURE_COLS
    }

    results = []
    for i in range(steps):
        pred: dict = {c: max(0.0, ema_vals[c] + drift[c] * (i + 1)) for c in FEATURE_COLS}
        pred["weather_label"] = "normal"
        pred["weather_confidence"] = 0.34
        pred["weather_proba"] = {"normal": 0.34, "rainy": 0.33, "sunny": 0.33}
        results.append(pred)
    return results


def _decode_proba(
    proba: np.ndarray,
    clf_classes: np.ndarray,
) -> tuple[str, float, dict]:
    """
    Safely decode classifier.predict_proba() output.

    [BUG2 FIX] RF classifiers only output columns for classes actually
    seen during training (stored in clf.classes_).  We map proba indices
    back via clf_classes — never via a fixed 0/1/2 assumption.

    Returns: (predicted_label, confidence, proba_dict)
    """
    best_idx = int(np.argmax(proba))
    best_class_int = int(clf_classes[best_idx])
    predicted_label = WEATHER_LABELS[best_class_int] if best_class_int < len(WEATHER_LABELS) else "normal"
    confidence = float(proba[best_idx])

    # Build full probability dict (fill 0.0 for unseen labels)
    proba_dict: dict[str, float] = {lbl: 0.0 for lbl in WEATHER_LABELS}
    for col_idx, cls_int in enumerate(clf_classes):
        lbl = WEATHER_LABELS[int(cls_int)] if int(cls_int) < len(WEATHER_LABELS) else "unknown"
        proba_dict[lbl] = round(float(proba[col_idx]), 4)

    return predicted_label, round(confidence, 4), proba_dict


def _model_forecast(recent_rows: list[dict], steps: int) -> list[dict]:
    """
    Multi-step autoregressive forecast using trained regressor + classifier.

    Each predicted step is appended to the sliding window for the next step.
    """
    with _model_lock:
        regressor    = _model_state["regressor"]
        classifier   = _model_state["classifier"]
        scaler       = _model_state["scaler"]
        W            = _model_state.get("window", WINDOW_SIZE)

    if regressor is None or classifier is None or scaler is None:
        raise RuntimeError("Model not trained")

    if len(recent_rows) < W:
        raise ValueError(f"Need ≥ {W} recent rows for inference, got {len(recent_rows)}")

    # Build raw feature matrix from recent rows
    raw_features: list[list[float]] = []
    for row in recent_rows[-W:]:
        try:
            vals = [float(row[c]) for c in FEATURE_COLS]
            h_sin, h_cos, d_sin, d_cos = _parse_time_features(
                row.get("date", ""), row.get("time", "")
            )
            raw_features.append(vals + [h_sin, h_cos, d_sin, d_cos])
        except Exception:
            raw_features.append([0.0] * 9)

    # Pad if needed
    while len(raw_features) < W:
        raw_features.insert(0, raw_features[0] if raw_features else [0.0] * 9)

    window_raw    = np.array(raw_features[-W:], dtype=np.float32)   # (W, 9)
    window_scaled = scaler.transform(window_raw)                     # (W, 9)

    clf_classes = classifier.classes_   # actual classes seen during training

    results = []
    for _ in range(steps):
        X_pred = window_scaled.flatten().reshape(1, -1)              # (1, W*9)

        # ── Regression ──────────────────────────────────────────────────────
        y_scaled_pred = regressor.predict(X_pred)[0]                 # (5,)

        # ── Classification ──────────────────────────────────────────────────
        proba = classifier.predict_proba(X_pred)[0]                  # (n_classes,)
        weather_label, confidence, proba_dict = _decode_proba(proba, clf_classes)

        # ── Inverse transform sensor values ─────────────────────────────────
        dummy = np.zeros((1, 9), dtype=np.float32)
        dummy[0, :5] = y_scaled_pred
        inv = scaler.inverse_transform(dummy)[0, :5]                 # (5,)

        pred_dict = {c: float(max(0.0, inv[j])) for j, c in enumerate(FEATURE_COLS)}
        pred_dict["weather_label"]      = weather_label
        pred_dict["weather_confidence"] = confidence
        pred_dict["weather_proba"]      = proba_dict
        results.append(pred_dict)

        # ── Autoregressive roll ──────────────────────────────────────────────
        new_row = np.zeros(9, dtype=np.float32)
        new_row[:5]  = y_scaled_pred
        new_row[5:]  = window_scaled[-1, 5:]   # reuse last time features
        window_scaled = np.roll(window_scaled, -1, axis=0)
        window_scaled[-1] = new_row

    return results


# ═══════════════════════════════════════════════════════════════════════════════
# DB helpers (for live data from ESP32)
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_live_readings(limit: int = 200) -> list[dict]:
    """Fetch recent sensor readings from SQLite (oldest-first). Returns [] if DB absent."""
    import sqlite3

    if not Path(DB_PATH).exists():
        return []
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT pm25, temperature, humidity, pressure, uv, received_at "
            "FROM readings ORDER BY received_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        conn.close()
        result = []
        for r in reversed(rows):
            d = dict(r)
            try:
                dt = datetime.fromisoformat(d["received_at"].replace("Z", "+00:00"))
                d["date"] = dt.strftime("%d/%m/%Y")
                d["time"] = dt.strftime("%H:%M:%S")
            except Exception:
                d["date"] = ""
                d["time"] = ""
            result.append(d)
        return result
    except Exception:
        return []


def _live_db_count() -> int:
    import sqlite3

    if not Path(DB_PATH).exists():
        return 0
    try:
        conn = sqlite3.connect(DB_PATH)
        n = conn.execute("SELECT COUNT(*) FROM readings").fetchone()[0]
        conn.close()
        return int(n)
    except Exception:
        return 0


def _load_csv_tail(n: int) -> list[dict]:
    """Return the last `n` rows from the combined CSV (as dicts) for inference context."""
    if not COMBINED_CSV.exists():
        return []
    rows: list[dict] = []
    with open(COMBINED_CSV, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows[-n:]


def _estimate_interval(readings: list[dict]) -> int:
    """Estimate sensor interval in seconds. Handles both SQLite ISO and CSV time formats.
    [BUG3 FIX] Normalises all datetimes to timezone-naive (UTC) before subtraction
    to avoid 'can't subtract offset-naive and offset-aware datetimes' TypeError.
    """
    if len(readings) < 2:
        return 30
    times: list[datetime] = []
    for r in readings[-20:]:
        if "received_at" in r:
            try:
                dt = datetime.fromisoformat(r["received_at"].replace("Z", "+00:00"))
                # Strip tzinfo → naive UTC for uniform comparison
                times.append(dt.replace(tzinfo=None))
                continue
            except Exception:
                pass
        if "date" in r and "time" in r:
            try:
                times.append(
                    datetime.strptime(f"{r['date']} {r['time']}", "%d/%m/%Y %H:%M:%S")
                )
            except Exception:
                pass
    if len(times) < 2:
        return 30
    diffs = [
        abs((times[i + 1] - times[i]).total_seconds())
        for i in range(len(times) - 1)
        if abs((times[i + 1] - times[i]).total_seconds()) > 0
    ]
    return int(np.median(diffs)) if diffs else 30


# ═══════════════════════════════════════════════════════════════════════════════
# Pydantic schemas
# ═══════════════════════════════════════════════════════════════════════════════

class PredictionPoint(BaseModel):
    step: int
    # Sensor forecasts
    pm25_predicted: float
    temperature_predicted: float
    humidity_predicted: float
    pressure_predicted: float
    uv_predicted: float
    # AQI derived from PM2.5
    aqi_predicted: int
    aqi_level: str
    # PM2.5 confidence band (±15%)
    pm25_lower: float
    pm25_upper: float
    # Weather classification
    weather_label: str
    weather_confidence: float
    weather_proba: Optional[dict] = None


class PredictResponse(BaseModel):
    predictions: list[dict]
    method: str
    steps: int
    interval_seconds: int
    trained_at: Optional[str] = None
    csv_rows_used: int
    live_db_rows: int
    data_source: str          # [BUG1 FIX] was missing → Pydantic ValidationError
    note: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# API routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "2.1.0",
        "db_path": DB_PATH,
        "db_exists": Path(DB_PATH).exists(),
        "csv_exists": COMBINED_CSV.exists(),
        "csv_path": str(COMBINED_CSV),
        "model_dir": str(MODEL_DIR),
        "model_persisted": (MODEL_DIR / "regressor.joblib").exists(),
    }


@app.get("/model/status")
def model_status():
    with _model_lock:
        s = _model_state.copy()
    live_count = _live_db_count()
    return {
        "trained": s["regressor"] is not None,
        "regressor_trained": s["regressor"] is not None,
        "classifier_trained": s["classifier"] is not None,
        "classifier_accuracy": s.get("classifier_accuracy"),
        "trained_at": s["trained_at"],
        "csv_rows": s["csv_rows"],
        "live_db_rows": live_count,
        "window_size": s.get("window", WINDOW_SIZE),
        "forecast_horizon": FORECAST_HORIZON,
        "training_in_progress": s["training_in_progress"],
        "last_error": s["last_error"],
        "supported_outputs": FEATURE_COLS + ["weather_label"],
        "model_persisted": (MODEL_DIR / "regressor.joblib").exists(),
    }


@app.post("/train")
async def train(background_tasks: BackgroundTasks):
    """Trigger (re)training from CSV in background. Models are saved to disk when done."""
    if not COMBINED_CSV.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Training CSV not found: {COMBINED_CSV}",
        )

    with _model_lock:
        if _model_state["training_in_progress"]:
            raise HTTPException(
                status_code=409,
                detail="Training already in progress — check GET /model/status",
            )

    # Count CSV rows quickly
    with open(COMBINED_CSV, encoding="utf-8") as f:
        row_count = sum(1 for _ in f) - 1

    if row_count < MIN_ROWS_FOR_TRAINING:
        raise HTTPException(
            status_code=422,
            detail=f"Not enough CSV rows: {row_count} (need ≥ {MIN_ROWS_FOR_TRAINING})",
        )

    background_tasks.add_task(_do_train)
    return {
        "message": "Training started in background",
        "csv_rows": row_count,
        "eta_seconds": max(30, row_count // 400),
        "check_status": "GET /model/status",
    }


@app.get("/predict")
def predict(steps: int = Query(default=6, ge=1, le=48)):
    """
    Forecast next `steps` time steps.
    Returns 5 sensor metrics + AQI + weather_label for each step.
    Falls back to EMA if model is not trained.

    Data priority: live SQLite DB → CSV tail (if DB has < WINDOW_SIZE rows)
    """
    # ── Select context data ────────────────────────────────────────────────────
    fetch_limit = max(WINDOW_SIZE * 2, 50)
    recent_rows = fetch_live_readings(limit=fetch_limit)
    data_source = "live_db"

    if len(recent_rows) < WINDOW_SIZE:
        recent_rows = _load_csv_tail(fetch_limit)
        data_source = "csv_tail"

    if len(recent_rows) < 3:
        raise HTTPException(
            status_code=404,
            detail="Not enough data for prediction (need ≥ 3 rows in DB or CSV)",
        )

    with _model_lock:
        trained    = _model_state["regressor"] is not None
        trained_at = _model_state["trained_at"]
        csv_rows   = _model_state["csv_rows"]
        last_error = _model_state["last_error"]

    live_count = _live_db_count()
    note: Optional[str] = None

    if trained:
        try:
            raw_preds = _model_forecast(recent_rows, steps)
            method = "rf_multioutput"
        except Exception as exc:
            raw_preds = _ema_forecast_multi(recent_rows, steps)
            method = "ema_fallback"
            note = f"Model error — EMA fallback: {exc}"
    else:
        raw_preds = _ema_forecast_multi(recent_rows, steps)
        method = "ema_fallback"
        note = last_error or "Model not trained — call POST /train"

    interval_sec = _estimate_interval(recent_rows)

    result: list[dict] = []
    for i, pred in enumerate(raw_preds):
        pm25 = max(0.0, pred["pm25"])
        aqi, level = _pm25_to_aqi(pm25)
        band = pm25 * 0.15
        result.append(
            PredictionPoint(
                step=i + 1,
                pm25_predicted=round(pm25, 2),
                temperature_predicted=round(pred["temperature"], 2),
                humidity_predicted=round(pred["humidity"], 2),
                pressure_predicted=round(pred["pressure"], 2),
                uv_predicted=round(max(0.0, pred["uv"]), 2),
                aqi_predicted=aqi,
                aqi_level=level,
                pm25_lower=round(max(0.0, pm25 - band), 2),
                pm25_upper=round(pm25 + band, 2),
                weather_label=pred.get("weather_label", "normal"),
                weather_confidence=pred.get("weather_confidence", 0.34),
                weather_proba=pred.get("weather_proba"),
            ).model_dump()
        )

    return PredictResponse(
        predictions=result,
        method=method,
        steps=steps,
        interval_seconds=interval_sec,
        trained_at=trained_at,
        csv_rows_used=csv_rows,
        live_db_rows=live_count,
        data_source=data_source,   # [BUG1 FIX]
        note=note,
    ).model_dump()
