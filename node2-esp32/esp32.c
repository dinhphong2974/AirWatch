#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <SD.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>

// ===================== SPI cho LoRa + SD =====================
#define SPI_SCK    18
#define SPI_MISO   19
#define SPI_MOSI   23

// ===================== LoRa =====================
#define LORA_SS    5
#define LORA_RST   14
#define LORA_DIO0  26

// ===================== TFT 1.8" ST7735 - SPI rieng =====================
#define TFT_SCK    25
#define TFT_MOSI   33
#define TFT_CS     32
#define TFT_DC     27
#define TFT_RST    4
#define TFT_BL     21

// ===================== SD Card =====================
#define SD_CS      13

// ===================== WiFi =====================
// WiFi se duoc cau hinh dong qua WiFiManager, khong can nap code lai.

// ===================== Dashboard Server =====================
const char* DASHBOARD_SERVER = "https://air-quality-dashboard-uxpq.onrender.com/api/data";

// ===================== TFT Object =====================
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCK, TFT_RST);

// ===================== Runtime =====================
unsigned long lastStatus = 0;
unsigned long lastWifiRetry = 0; 
bool g_wifiEnabled = true;       

// --------------------- Layout ----------------------
#define HEADER_Y      4
#define TABLE_X       34
#define TABLE_Y       16
#define TABLE_W       122
#define TABLE_H       76
#define LABEL_X       40
#define VALUE_X       92
#define ROW_PM25      24
#define ROW_TEMP      34
#define ROW_HUM       44
#define ROW_PRES      54
#define ROW_UV        64
#define ROW_DATE      74
#define TIME_LABEL_X  2
#define TIME_VALUE_X  2
#define TIME_Y        28
#define STATUS_X      4
#define STATUS_Y1     100
#define STATUS_Y2     112
#define WIFI_X        108
#define SD_X          132
#define NET_Y         112

struct SensorData {
  float temperature = 0.0;
  float humidity    = 0.0;
  float pressure    = 0.0;
  float uv          = 0.0;
  float pm25        = 0.0;
  String timeStr    = "--:--:--";
  String dateStr    = "--/--/----";
  bool valid        = false;
};

struct DisplayCache {
  String pm25 = "";
  String temp = "";
  String hum  = "";
  String pres = "";
  String uv   = "";
  String time = "";
  String date = "";
  String wifi = "";
  String sd   = "";
  String status1 = "";
  String status2 = "";
  uint16_t statusColor = 0xFFFF;
};

DisplayCache g_disp;

// ============================================================================
// [1] CAC HAM HIEN THI (Phai nam tren cung de cac ham khac goi duoc)
// ============================================================================

void releaseTFT() {
  digitalWrite(TFT_CS, HIGH);
  delayMicroseconds(10);
}

void clearTextArea(int x, int y, int w, int h) {
  tft.fillRect(x, y, w, h, ST77XX_BLACK);
}

void drawStaticLayout() {
  tft.fillScreen(ST77XX_BLACK);
  tft.setRotation(1);
  tft.setTextWrap(false);
  tft.setTextSize(1);
  tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
  tft.setCursor(28, HEADER_Y);
  tft.print("ESP RECEIVER");
  tft.drawRect(TABLE_X, TABLE_Y, TABLE_W, TABLE_H, ST77XX_BLUE);
  tft.setTextColor(ST77XX_CYAN, ST77XX_BLACK);
  tft.setCursor(TIME_LABEL_X, TIME_Y - 10);
  tft.print("TIME");
  tft.drawRect(0, TABLE_Y, 32, 28, ST77XX_BLUE);
  tft.setTextColor(ST77XX_CYAN, ST77XX_BLACK);
  tft.setCursor(LABEL_X, ROW_PM25); tft.print("PM2.5");
  tft.setCursor(LABEL_X, ROW_TEMP); tft.print("Temp");
  tft.setCursor(LABEL_X, ROW_HUM);  tft.print("Hum");
  tft.setCursor(LABEL_X, ROW_PRES); tft.print("Pres");
  tft.setCursor(LABEL_X, ROW_UV);   tft.print("UV");
  tft.setCursor(LABEL_X, ROW_DATE); tft.print("Date");
  tft.drawLine(86, TABLE_Y + 2, 86, TABLE_Y + TABLE_H - 2, ST77XX_BLUE);
  tft.drawRect(0, 94, 160, 34, ST77XX_BLUE);
  releaseTFT();
}

void updateTextField(int x, int y, int w, const String &newText, String &cache,
                     uint16_t fg = ST77XX_YELLOW, uint16_t bg = ST77XX_BLACK) {
  if (newText == cache) return;
  clearTextArea(x, y, w, 10);
  tft.setTextColor(fg, bg);
  tft.setCursor(x, y);
  tft.print(newText);
  cache = newText;
}

void updateStatusLine(const String &line1, const String &line2 = "", uint16_t color = ST77XX_WHITE) {
  bool changed = (line1 != g_disp.status1) || (line2 != g_disp.status2) || (color != g_disp.statusColor);
  if (!changed) return;
  clearTextArea(2, STATUS_Y1, 156, 10);
  clearTextArea(2, STATUS_Y2, 106, 10); // Xoa den sat mep WIFI_X (108) de khong de lai rac
  tft.setTextSize(1);
  tft.setTextColor(color, ST77XX_BLACK);
  tft.setCursor(STATUS_X, STATUS_Y1);
  tft.print(line1);
  tft.setCursor(STATUS_X, STATUS_Y2);
  tft.print(line2);
  g_disp.status1 = line1;
  g_disp.status2 = line2;
  g_disp.statusColor = color;
  releaseTFT();
}

void updateSensorDisplay(const SensorData &d, bool wifiOk, bool sdOk) {
  updateTextField(TIME_VALUE_X, TIME_Y, 30, d.timeStr.substring(0, 5), g_disp.time, ST77XX_YELLOW);
  updateTextField(VALUE_X, ROW_PM25, 60, String(d.pm25, 1),        g_disp.pm25, ST77XX_YELLOW);
  updateTextField(VALUE_X, ROW_TEMP, 60, String(d.temperature, 1), g_disp.temp, ST77XX_YELLOW);
  updateTextField(VALUE_X, ROW_HUM,  60, String(d.humidity, 1),    g_disp.hum,  ST77XX_YELLOW);
  updateTextField(VALUE_X, ROW_PRES, 60, String(d.pressure, 1),    g_disp.pres, ST77XX_YELLOW);
  updateTextField(VALUE_X, ROW_UV,   60, String(d.uv, 2),          g_disp.uv,   ST77XX_YELLOW);
  updateTextField(VALUE_X, ROW_DATE, 60, d.dateStr,                g_disp.date, ST77XX_YELLOW);

  String wifiText = String("W:") + (wifiOk ? "OK" : "ER");
  if (wifiText != g_disp.wifi) {
    clearTextArea(WIFI_X, NET_Y, 24, 10);
    tft.setTextColor(wifiOk ? ST77XX_GREEN : ST77XX_RED, ST77XX_BLACK);
    tft.setCursor(WIFI_X, NET_Y);
    tft.print(wifiText);
    g_disp.wifi = wifiText;
  }
  String sdText = String("S:") + (sdOk ? "OK" : "ER");
  if (sdText != g_disp.sd) {
    clearTextArea(SD_X, NET_Y, 28, 10);
    tft.setTextColor(sdOk ? ST77XX_GREEN : ST77XX_RED, ST77XX_BLACK);
    tft.setCursor(SD_X, NET_Y);
    tft.print(sdText);
    g_disp.sd = sdText;
  }
  releaseTFT();
}

// ============================================================================
// [2] CAC HAM WIFI & KET NOI
// ============================================================================

void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println("Entered config mode");
  updateStatusLine("WiFi Config Mode", "Join:ESP32_Setup", ST77XX_MAGENTA);
}

void connectWiFi() {
  WiFiManager wm;
  wm.setConfigPortalTimeout(120);
  wm.setAPCallback(configModeCallback);
  updateStatusLine("Connecting WiFi...", "Wait saved WiFi", ST77XX_CYAN);

  if (!wm.autoConnect("ESP32_AQI_Setup")) {
    Serial.println("WiFi Config Timeout - Entering Offline Mode");
    g_wifiEnabled = false;
    updateStatusLine("OFFLINE MODE", "Logging SD only", ST77XX_ORANGE);
    delay(2000);
    return;
  }

  g_wifiEnabled = true;
  Serial.println("WiFi connected");
  updateStatusLine("WiFi Connected!", WiFi.localIP().toString(), ST77XX_GREEN);
}

bool sendToDashboard(const SensorData &d) {
  if (!d.valid) return false;

  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastWifiRetry > 120000 || lastWifiRetry == 0) {
      lastWifiRetry = now;
      updateStatusLine("WiFi Reconnecting...", "Wait 10s...", ST77XX_CYAN);
      WiFi.begin(); 
      int retryCount = 0;
      while (WiFi.status() != WL_CONNECTED && retryCount < 20) {
        delay(500);
        retryCount++;
      }
      if (WiFi.status() == WL_CONNECTED) {
        updateStatusLine("WiFi Connected!", WiFi.localIP().toString(), ST77XX_GREEN);
      } else {
        updateStatusLine("OFFLINE MODE", "Retry in 2 mins", ST77XX_ORANGE);
      }
    }
  } else {
    lastWifiRetry = 0;
  }

  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(DASHBOARD_SERVER);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  char json[256];
  snprintf(json, sizeof(json),
    "{\"pm25\":%.2f,\"temperature\":%.2f,\"humidity\":%.2f,"
    "\"pressure\":%.2f,\"uv\":%.2f,"
    "\"date\":\"%s\",\"time\":\"%s\"}",
    d.pm25, d.temperature, d.humidity, d.pressure, d.uv,
    d.dateStr.c_str(), d.timeStr.c_str()
  );

  int httpResponseCode = http.POST(json);
  http.end();
  return (httpResponseCode == 200);
}

// ============================================================================
// [3] CAC HAM XU LY DU LIEU & THE SD
// ============================================================================

void deselectAllSPI() {
  digitalWrite(LORA_SS, HIGH);
  digitalWrite(SD_CS, HIGH);
  digitalWrite(TFT_CS, HIGH);
  delayMicroseconds(10);
}

bool getFieldValue(const String &data, const String &key, String &out) {
  int start = data.indexOf(key);
  if (start == -1) return false;
  start += key.length();
  int end = data.indexOf(",", start);
  if (end == -1) end = data.length();
  out = data.substring(start, end);
  out.trim();
  return true;
}

bool parseData(const String &data, SensorData &outData) {
  String sTemp, sHum, sPress, sUV, sPM25, sTime, sDate;
  bool ok1 = getFieldValue(data, "T=", sTemp);
  bool ok2 = getFieldValue(data, "H=", sHum);
  bool ok3 = getFieldValue(data, "P=", sPress);
  bool ok4 = getFieldValue(data, "UV=", sUV);
  bool ok5 = getFieldValue(data, "PM25=", sPM25);
  bool ok6 = getFieldValue(data, "TIME=", sTime);
  bool ok7 = getFieldValue(data, "DATE=", sDate);
  if (!(ok1 && ok2 && ok3 && ok4 && ok5 && ok6 && ok7)) return false;
  outData.temperature = sTemp.toFloat();
  outData.humidity    = sHum.toFloat();
  outData.pressure    = sPress.toFloat();
  outData.uv          = sUV.toFloat();
  outData.pm25        = sPM25.toFloat();
  outData.timeStr     = sTime;
  outData.dateStr     = sDate;
  outData.valid       = true;
  return true;
}

String makeFileNameFromDate(const String &dateStr) {
  int p1 = dateStr.indexOf('/');
  int p2 = dateStr.indexOf('/');
  if (p1 == -1) return "/0000-00-00.csv";
  p2 = dateStr.indexOf('/', p1 + 1);
  if (p2 == -1) return "/0000-00-00.csv";
  String day   = dateStr.substring(0, p1);
  String month = dateStr.substring(p1 + 1, p2);
  String year  = dateStr.substring(p2 + 1);
  day.trim(); month.trim(); year.trim();
  int d = day.toInt(); int m = month.toInt(); int y = year.toInt();
  if (year.length() == 2) y = y + 2000;
  char buf[24];
  sprintf(buf, "/%04d-%02d-%02d.csv", y, m, d);
  return String(buf);
}

bool initSD() {
  deselectAllSPI();
  delay(10);
  SD.end();
  delay(10);
  if (!SD.begin(SD_CS)) return false;
  if (SD.cardType() == CARD_NONE) return false;
  return true;
}

bool saveToSD(const SensorData &d, const String &rawLine) {
  if (!d.valid) return false;
  String fileName = makeFileNameFromDate(d.dateStr);
  String line = d.dateStr + "," + d.timeStr + "," + String(d.pm25, 2) + "," + 
                String(d.temperature, 2) + "," + String(d.humidity, 2) + "," + 
                String(d.pressure, 2) + "," + String(d.uv, 2) + ",\"" + rawLine + "\"";
  
  unsigned long startTry = millis();
  while (millis() - startTry < 1500) {
    deselectAllSPI();
    delay(5);
    bool fileExists = SD.exists(fileName);
    File file = SD.open(fileName, FILE_APPEND);
    if (!file) {
      SD.end(); delay(20); deselectAllSPI(); delay(20);
      if (!SD.begin(SD_CS)) { delay(80); continue; }
      delay(30); continue;
    }
    if (!fileExists) file.println("date,time,pm25,temperature,humidity,pressure,uv,raw");
    file.println(line);
    file.close();
    return true;
  }
  return false;
}

// ============================================================================
// [4] SETUP & LOOP
// ============================================================================

bool initLoRa() {
  deselectAllSPI();
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(433E6)) return false;
  LoRa.setSpreadingFactor(12);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0x34);
  return true;
}

void initTFT() {
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);
  tft.initR(INITR_BLACKTAB);
  tft.setRotation(1);
  drawStaticLayout();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  pinMode(LORA_SS, OUTPUT);
  pinMode(TFT_CS, OUTPUT);
  pinMode(SD_CS, OUTPUT);
  deselectAllSPI();
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);
  SPI.setFrequency(4000000);
  initTFT();
  updateStatusLine("Booting...", "", ST77XX_WHITE);
  connectWiFi();
  bool sdOk = initSD();
  bool loraOk = initLoRa();
  if (!loraOk) {
    updateStatusLine("LoRa init failed!", "", ST77XX_RED);
    while (1);
  }
  updateStatusLine("System Ready", "", ST77XX_GREEN);
  delay(500);
  SensorData bootData;
  updateSensorDisplay(bootData, WiFi.status() == WL_CONNECTED, sdOk);
  updateStatusLine("Cho goi du lieu...", "", ST77XX_WHITE);
}

void loop() {
  static bool sdAvailable = true;
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String rx = "";
    updateStatusLine("Dang nhan gói LoRa...", "", ST77XX_WHITE);
    while (LoRa.available()) rx += (char)LoRa.read();

    Serial.println("\n--- NEW PACKET RECEIVED ---");
    Serial.println("Raw: " + rx);

    SensorData data;
    if (parseData(rx, data)) {
      // In chi tiet ra Serial Monitor
      Serial.println("Parsed Data:");
      Serial.print(" > PM2.5: "); Serial.println(data.pm25);
      Serial.print(" > Temp:  "); Serial.println(data.temperature);
      Serial.print(" > Hum:   "); Serial.println(data.humidity);
      Serial.print(" > Pres:  "); Serial.println(data.pressure);
      Serial.print(" > UV:    "); Serial.println(data.uv);
      Serial.print(" > Time:  "); Serial.println(data.timeStr);
      Serial.print(" > Date:  "); Serial.println(data.dateStr);

      sdAvailable = saveToSD(data, rx);
      if (!sdAvailable) {
        Serial.println("SD Error!");
        updateStatusLine("Loi ghi the SD", "", ST77XX_RED);
      } else {
        Serial.println("Saved to SD OK");
        updateStatusLine("Da luu vao the SD", "", ST77XX_GREEN);
      }
      
      bool cloudOk = sendToDashboard(data);
      if (cloudOk) {
        Serial.println("Sent to Dashboard OK");
        updateStatusLine("Da gui Dashboard", "thanh cong", ST77XX_GREEN);
      } else {
        Serial.println("Dashboard Send Failed");
        updateStatusLine("Gui Dashboard loi", "", ST77XX_RED);
      }
      
      updateSensorDisplay(data, WiFi.status() == WL_CONNECTED, sdAvailable);
    } else {
      Serial.println("Parse Failed! Check packet format.");
      updateStatusLine("Goi du lieu loi", "", ST77XX_RED);
    }
  }
  if (millis() - lastStatus >= 10000) {
    lastStatus = millis();
    Serial.println("Receiver running...");
  }
}