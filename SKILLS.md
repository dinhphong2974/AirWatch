# SKILLS.md — Skills Reference for AQI Dashboard & AI Pipeline Project
## Project: Air Quality Monitoring Dashboard (STM32 + ESP32 LoRa System)

> This file catalogs all selected skills from `C:\Users\ASUS\.gemini\antigravity\skills` that will
> be actively used during development. Each entry explains **what** the skill does and **when** to
> invoke it in this project. Read the referenced SKILL.md before using each skill.

---

## 📋 Table of Contents
1. [Frontend & Web UI Skills](#1-frontend--web-ui-skills)
2. [Backend & Database Skills](#2-backend--database-skills)
3. [AI & Machine Learning Skills](#3-ai--machine-learning-skills)
4. [Debugging Skills](#4-debugging-skills)
5. [Code Review Skills](#5-code-review-skills)
6. [Workflow & Process Skills](#6-workflow--process-skills)
7. [Testing & Quality Skills](#7-testing--quality-skills)
8. [Deployment Skills](#8-deployment-skills)

---

## 1. Frontend & Web UI Skills

### `nextjs-app-router-patterns`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\nextjs-app-router-patterns`
- **Use when:** Setting up the Next.js 14 App Router structure, deciding between React Server Components vs Client Components, configuring layouts and route groups
- **Key features:** App Router folder conventions, Server Actions, Route Handlers, metadata API
- **Applied to:** `/app` directory structure, `/app/api/` routes, `/app/history/` page

### `react-best-practices`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\react-best-practices`
- **Use when:** Building reusable components (`MetricCard`, `AqiGauge`, `AlertBanner`), managing state with `useState`/`useEffect`, integrating SWR for real-time polling
- **Key features:** Component design patterns, hook best practices, performance optimization, memoization
- **Applied to:** All `components/` files, `LivePanel.tsx` SWR integration

### `react-ui-patterns`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\react-ui-patterns`
- **Use when:** Implementing complex UI patterns like animated gauges, responsive grid layouts, conditional rendering of alert banners
- **Applied to:** `AqiGauge.tsx` SVG animation, responsive sidebar layout

### `antigravity-design-expert`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\antigravity-design-expert`
- **Use when:** Designing the visual system — color palette (HSL dark mode), glassmorphism cards, typography hierarchy, micro-animations
- **Key features:** Premium dark mode aesthetics, glassmorphism (`backdrop-filter: blur`), smooth hover transitions
- **Applied to:** `globals.css` design tokens, card component styles, alert banner animations

### `design-spells`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\design-spells`
- **Use when:** Adding visual polish — gradient fills on charts, glow effects on alert banners, animated status indicators (live dot)
- **Applied to:** Chart area gradients, AQI color glow effects, live indicator animation

### `baseline-ui`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\baseline-ui`
- **Use when:** Establishing foundational UI conventions — spacing scale, border-radius tokens, shadow levels, z-index management
- **Applied to:** CSS custom properties in `globals.css`

---

## 2. Backend & Database Skills

### `api-design-principles`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\api-design-principles`
- **Use when:** Designing the REST API routes (`POST /api/data`, `GET /api/latest`, `GET /api/history`) — naming conventions, request/response schemas, error handling
- **Key features:** RESTful conventions, consistent error responses, HTTP status codes
- **Applied to:** `/app/api/` Next.js route handlers

### `database`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\database`
- **Use when:** Designing the SQLite schema for sensor readings, writing efficient queries with aggregations (MIN/MAX/AVG) for the 24h summary, indexing strategy
- **Applied to:** `lib/db.ts` schema definition and query functions

### `nodejs-backend-patterns`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\nodejs-backend-patterns`
- **Use when:** Writing Next.js API route handlers — async error handling patterns, middleware patterns, request validation
- **Applied to:** All `/app/api/` route handlers

### `api-documentation`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\api-documentation`
- **Use when:** Documenting the ESP32-facing API endpoints so future developers (or you) know the exact JSON contract between ESP32 firmware and the backend
- **Applied to:** API route files as JSDoc comments

---

## 3. AI & Machine Learning Skills

### `scikit-learn`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\scikit-learn`
- **Use when (Phase 2 — AI):** Building the Random Forest Regressor for residual prediction, using `MinMaxScaler` for time-series normalization, `TimeSeriesSplit` for walk-forward validation
- **Key features:** `RandomForestRegressor`, `Pipeline`, `TimeSeriesSplit`, `MinMaxScaler`, metrics (MAE/RMSE)
- **Applied to:** `backend/train.py` ML pipeline (Phase 2)

### `python-pro`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\python-pro`
- **Use when (Phase 2 — AI):** Writing clean Python code for the FastAPI prediction server and LSTM+RF training pipeline
- **Applied to:** `backend/main.py`, `backend/train.py`

### `plotly`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\plotly`
- **Use when (Phase 2 — AI):** Generating model evaluation charts (Actual vs Predicted comparison, feature importance bar chart) during the training/validation phase
- **Applied to:** `backend/evaluate.py` visualization scripts

### `matplotlib`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\matplotlib`
- **Use when (Phase 2 — AI):** Quick inline debugging plots during model development (loss curves, residual distribution)
- **Applied to:** Jupyter notebook / training scripts for LSTM loss visualization

---

## 4. Debugging Skills 🐛

> These skills are CRITICAL. Apply them **before escalating** any issue or spending more than
> 10 minutes stuck on a problem. Follow the systematic approach below.

### `debugging-strategies`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\debugging-strategies`
- **Use when:** Any bug arises during development — broken API routes, incorrect AQI calculations, chart rendering issues, SQLite query errors
- **Approach:**
  1. Reproduce the issue → capture browser console, Next.js terminal logs
  2. Form a hypothesis about root cause
  3. Narrow scope with targeted tests (binary search approach)
  4. Verify fix doesn't break other features
- **Resources:** `debugging-strategies/resources/implementation-playbook.md`

### `debugging-toolkit-smart-debug`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\debugging-toolkit-smart-debug`
- **Use when:** Need structured, multi-step debugging approach with specific tool recommendations for Next.js (React DevTools, Network tab, `console.time()`)
- **Applied to:** SWR polling timing issues, API response format mismatches, SQLite locking errors

### `phase-gated-debugging`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\phase-gated-debugging`
- **Use when:** Complex bugs spanning multiple layers (e.g., ESP32 sends data → API receives incorrectly → DB stores wrong value → chart shows wrong graph). Break into phases: Network → API → DB → Frontend
- **Workflow:**
  - **Phase 1:** Verify ESP32 POST payload format with a mock HTTP client
  - **Phase 2:** Verify API route parsing and DB write
  - **Phase 3:** Verify DB read and JSON response
  - **Phase 4:** Verify chart data binding in React

### `error-debugging-error-analysis`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\error-debugging-error-analysis`
- **Use when:** Analyzing TypeScript type errors, ESLint warnings, or Next.js build failures
- **Applied to:** `npm run build` error investigation

### `systematic-debugging`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\systematic-debugging`
- **Use when:** Production issues after deployment (Vercel function errors, Railway container crashes)
- **Approach:** Check logs first → reproduce locally → fix → verify on staging

---

## 5. Code Review Skills ✅

> Apply these skills after **completing each feature/component** before moving to the next.
> Do not skip review — it prevents accumulating technical debt.

### `code-review-excellence`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\code-review-excellence`
- **Use when:** Reviewing any completed component or API route before marking it done
- **Review checklist for this project:**
  - [ ] TypeScript types are strict (no `any`)
  - [ ] API route validates input before writing to DB
  - [ ] AQI calculation logic matches US-EPA standard exactly
  - [ ] CSS uses only defined custom properties (no hardcoded magic values)
  - [ ] SWR error states are handled gracefully
- **Resources:** `code-review-excellence/resources/implementation-playbook.md`

### `code-review-checklist`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\code-review-checklist`
- **Use when:** Quick sanity-check on a specific file (e.g., verifying `aqi.ts` calculation logic)
- **Key checks:** Correctness, edge cases (null/undefined data), security (SQL injection prevention), performance (unnecessary re-renders)

### `clean-code`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\clean-code`
- **Use when:** Refactoring any component that grows too large (>150 lines), extracting reusable helpers, renaming for clarity
- **Principles applied:**
  - Single Responsibility: Each component does one thing
  - DRY: AQI color logic lives only in `lib/aqi.ts`
  - Descriptive naming: `calculateAqiFromPm25()` not `calcAqi()`

### `ui-review`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\ui-review`
- **Use when:** Reviewing visual output of components — check spacing consistency, color contrast (WCAG AA), animation performance (60fps), mobile layout
- **Applied to:** After completing each UI component and the full page layout

### `fix-review`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\fix-review`
- **Use when:** After applying a bug fix — verify the fix is correct, not just symptom-masking, and no regressions introduced

---

## 6. Workflow & Process Skills 🔄

> These define HOW we work — the development process, not just the code.

### `antigravity-workflows`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\antigravity-workflows`
- **Use when:** Need to orchestrate multiple skills for a complex phase (e.g., "Build and ship the frontend")
- **Workflow to follow for this project:** `ship-saas-mvp` template
- **Process:** Plan → Build → Review → Test → Ship

### `concise-planning`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\concise-planning`
- **Use when:** Breaking down a large task (e.g., "Build all chart components") into small, concrete, verifiable steps
- **Rule:** Each step must produce a testable output within 30 minutes

### `executing-plans`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\executing-plans`
- **Use when:** Working through the sprint plan — track progress, update task.md, communicate blockers
- **Process:**
  1. Announce the step being executed
  2. Execute it
  3. Verify the output
  4. Mark complete before proceeding

### `git-pr-workflows-git-workflow`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\git-pr-workflows-git-workflow`
- **Use when:** Committing code — follow conventional commit messages (`feat:`, `fix:`, `style:`, `refactor:`)
- **Branch strategy:** `main` = production, feature branches for each component group

### `workflow-patterns`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\workflow-patterns`
- **Use when:** Designing the data flow in the application — from ESP32 POST → DB write → API read → SWR → React render
- **Applied to:** Documenting the full data pipeline in code comments

---

## 7. Testing & Quality Skills 🧪

### `javascript-testing-patterns`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\javascript-testing-patterns`
- **Use when:** Writing unit tests for `lib/aqi.ts` (AQI calculation logic) — the most critical pure function that must be correct
- **Test cases required:**
  - PM2.5 = 0 → AQI = 0, Level = "Good"
  - PM2.5 = 35.4 → AQI = 100, Level = "Moderate"
  - PM2.5 = 55.5 → AQI = 151, Level = "Unhealthy"
  - PM2.5 = 250.5 → AQI = 301, Level = "Hazardous"

### `lint-and-validate`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\lint-and-validate`
- **Use when:** Before every deploy — run ESLint, TypeScript compiler check, and `npm run build`
- **Commands:**
  ```bash
  npm run lint         # ESLint
  npx tsc --noEmit     # TypeScript strict check
  npm run build        # Next.js production build
  ```

### `e2e-testing`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\e2e-testing`
- **Use when:** Final verification before public deploy — test the complete flow: mock ESP32 POST → data appears on dashboard → alert triggers at correct threshold
- **Tool:** Playwright (or manual browser testing)

---

## 8. Deployment Skills 🚀

### `deployment-procedures`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\deployment-procedures`
- **Use when:** Following the deployment checklist — set environment variables, verify API URL in esp32.c, confirm DNS propagation
- **Deploy target for this project:** Railway (backend) + Vercel (frontend) — public URLs for anyone to access

### `deployment-validation-config-validate`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\deployment-validation-config-validate`
- **Use when:** After deploy — verify environment variables are set correctly on Railway/Vercel, API is reachable from public internet, CORS headers allow browser requests

### `devops-deploy`
- **Path:** `C:\Users\ASUS\.gemini\antigravity\skills\devops-deploy`
- **Use when:** Troubleshooting deployment issues — Railway container not starting, Vercel build failing, environment variable missing

---

## 🔑 LSTM + Random Forest Hybrid Approach (Phase 2 Reference)

When Phase 2 (AI) begins, follow this pipeline design:

```
Raw Time Series Data (SQLite)
         │
         ▼
[Data Preprocessing — scikit-learn]
   MinMaxScaler normalization
   Lag feature engineering (t-1, t-2, t-6, t-24)
   TimeSeriesSplit for walk-forward validation
         │
         ▼
[Stage 1: LSTM — TensorFlow/Keras]
   Architecture: 1 LSTM layer (16-32 units) + Dropout(0.3)
   Input: sliding window of 24 timesteps
   Output: predicted baseline trend Ŷ_lstm
         │
         ▼
[Stage 2: Random Forest — scikit-learn]
   Input: lag features + Ŷ_lstm + time-of-day features
   Output: residual correction Ê_rf
         │
         ▼
[Final Prediction]
   Ŷ_final = Ŷ_lstm + Ê_rf
         │
         ▼
[Evaluation — MAE, RMSE, R²]
   Plot: Actual vs Predicted (plotly)
```

**Why this works for small datasets:**
- LSTM learns temporal trends without going deep (avoids overfitting)
- Random Forest corrects systematic errors using structured features
- Walk-forward validation respects time order (no data leakage)

---

*Last updated: 2026-06-01 | Project: AQI Dashboard v2*
