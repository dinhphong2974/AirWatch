#include "lcd_st7789.h"
#include <stdio.h>
#include <string.h>

/* =========================
   ST7789 commands
   ========================= */
#define ST7789_SWRESET   0x01
#define ST7789_SLPOUT    0x11
#define ST7789_COLMOD    0x3A
#define ST7789_MADCTL    0x36
#define ST7789_CASET     0x2A
#define ST7789_RASET     0x2B
#define ST7789_RAMWR     0x2C
#define ST7789_NORON     0x13
#define ST7789_DISPON    0x29

#define LCD_CS_LOW()     HAL_GPIO_WritePin(LCD_CS_PORT, LCD_CS_PIN, GPIO_PIN_RESET)
#define LCD_CS_HIGH()    HAL_GPIO_WritePin(LCD_CS_PORT, LCD_CS_PIN, GPIO_PIN_SET)
#define LCD_DC_LOW()     HAL_GPIO_WritePin(LCD_DC_PORT, LCD_DC_PIN, GPIO_PIN_RESET)
#define LCD_DC_HIGH()    HAL_GPIO_WritePin(LCD_DC_PORT, LCD_DC_PIN, GPIO_PIN_SET)
#define LCD_RST_LOW()    HAL_GPIO_WritePin(LCD_RST_PORT, LCD_RST_PIN, GPIO_PIN_RESET)
#define LCD_RST_HIGH()   HAL_GPIO_WritePin(LCD_RST_PORT, LCD_RST_PIN, GPIO_PIN_SET)
#define LCD_BL_ON()      HAL_GPIO_WritePin(LCD_BL_PORT, LCD_BL_PIN, GPIO_PIN_SET)

static uint16_t lcd_width = LCD_WIDTH;
static uint16_t lcd_height = LCD_HEIGHT;

/* font 5x7 ASCII */
static const uint8_t font5x7[][5] = {
    {0x00,0x00,0x00,0x00,0x00},{0x00,0x00,0x5F,0x00,0x00},{0x00,0x07,0x00,0x07,0x00},{0x14,0x7F,0x14,0x7F,0x14},
    {0x24,0x2A,0x7F,0x2A,0x12},{0x23,0x13,0x08,0x64,0x62},{0x36,0x49,0x55,0x22,0x50},{0x00,0x05,0x03,0x00,0x00},
    {0x00,0x1C,0x22,0x41,0x00},{0x00,0x41,0x22,0x1C,0x00},{0x14,0x08,0x3E,0x08,0x14},{0x08,0x08,0x3E,0x08,0x08},
    {0x00,0x50,0x30,0x00,0x00},{0x08,0x08,0x08,0x08,0x08},{0x00,0x60,0x60,0x00,0x00},{0x20,0x10,0x08,0x04,0x02},
    {0x3E,0x51,0x49,0x45,0x3E},{0x00,0x42,0x7F,0x40,0x00},{0x42,0x61,0x51,0x49,0x46},{0x21,0x41,0x45,0x4B,0x31},
    {0x18,0x14,0x12,0x7F,0x10},{0x27,0x45,0x45,0x45,0x39},{0x3C,0x4A,0x49,0x49,0x30},{0x01,0x71,0x09,0x05,0x03},
    {0x36,0x49,0x49,0x49,0x36},{0x06,0x49,0x49,0x29,0x1E},{0x00,0x36,0x36,0x00,0x00},{0x00,0x56,0x36,0x00,0x00},
    {0x08,0x14,0x22,0x41,0x00},{0x14,0x14,0x14,0x14,0x14},{0x00,0x41,0x22,0x14,0x08},{0x02,0x01,0x51,0x09,0x06},
    {0x32,0x49,0x79,0x41,0x3E},{0x7E,0x11,0x11,0x11,0x7E},{0x7F,0x49,0x49,0x49,0x36},{0x3E,0x41,0x41,0x41,0x22},
    {0x7F,0x41,0x41,0x22,0x1C},{0x7F,0x49,0x49,0x49,0x41},{0x7F,0x09,0x09,0x09,0x01},{0x3E,0x41,0x49,0x49,0x7A},
    {0x7F,0x08,0x08,0x08,0x7F},{0x00,0x41,0x7F,0x41,0x00},{0x20,0x40,0x41,0x3F,0x01},{0x7F,0x08,0x14,0x22,0x41},
    {0x7F,0x40,0x40,0x40,0x40},{0x7F,0x02,0x0C,0x02,0x7F},{0x7F,0x04,0x08,0x10,0x7F},{0x3E,0x41,0x41,0x41,0x3E},
    {0x7F,0x09,0x09,0x09,0x06},{0x3E,0x41,0x51,0x21,0x5E},{0x7F,0x09,0x19,0x29,0x46},{0x46,0x49,0x49,0x49,0x31},
    {0x01,0x01,0x7F,0x01,0x01},{0x3F,0x40,0x40,0x40,0x3F},{0x1F,0x20,0x40,0x20,0x1F},{0x7F,0x20,0x18,0x20,0x7F},
    {0x63,0x14,0x08,0x14,0x63},{0x03,0x04,0x78,0x04,0x03},{0x61,0x51,0x49,0x45,0x43},{0x00,0x7F,0x41,0x41,0x00},
    {0x02,0x04,0x08,0x10,0x20},{0x00,0x41,0x41,0x7F,0x00},{0x04,0x02,0x01,0x02,0x04},{0x40,0x40,0x40,0x40,0x40},
    {0x00,0x01,0x02,0x04,0x00},{0x20,0x54,0x54,0x54,0x78},{0x7F,0x48,0x44,0x44,0x38},{0x38,0x44,0x44,0x44,0x20},
    {0x38,0x44,0x44,0x48,0x7F},{0x38,0x54,0x54,0x54,0x18},{0x08,0x7E,0x09,0x01,0x02},{0x08,0x14,0x54,0x54,0x3C},
    {0x7F,0x08,0x04,0x04,0x78},{0x00,0x44,0x7D,0x40,0x00},{0x20,0x40,0x44,0x3D,0x00},{0x7F,0x10,0x28,0x44,0x00},
    {0x00,0x41,0x7F,0x40,0x00},{0x7C,0x04,0x18,0x04,0x78},{0x7C,0x08,0x04,0x04,0x78},{0x38,0x44,0x44,0x44,0x38},
    {0x7C,0x14,0x14,0x14,0x08},{0x08,0x14,0x14,0x18,0x7C},{0x7C,0x08,0x04,0x04,0x08},{0x48,0x54,0x54,0x54,0x20},
    {0x04,0x3F,0x44,0x40,0x20},{0x3C,0x40,0x40,0x20,0x7C},{0x1C,0x20,0x40,0x20,0x1C},{0x3C,0x40,0x30,0x40,0x3C},
    {0x44,0x28,0x10,0x28,0x44},{0x0C,0x50,0x50,0x50,0x3C},{0x44,0x64,0x54,0x4C,0x44},{0x00,0x08,0x36,0x41,0x00},
    {0x00,0x00,0x7F,0x00,0x00},{0x00,0x41,0x36,0x08,0x00},{0x08,0x08,0x2A,0x1C,0x08}
};

static void LCD_SetAddressWindow(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1);
static uint16_t center_text_x(uint16_t card_x, uint16_t card_w, const char *txt, uint8_t size);
static void LCD_WriteCommand(uint8_t cmd)
{
    HAL_GPIO_WritePin(LCD_DC_PORT, LCD_DC_PIN, GPIO_PIN_RESET);
    HAL_GPIO_WritePin(LCD_CS_PORT, LCD_CS_PIN, GPIO_PIN_RESET);
    HAL_SPI_Transmit(&hspi2, &cmd, 1, HAL_MAX_DELAY);
    HAL_GPIO_WritePin(LCD_CS_PORT, LCD_CS_PIN, GPIO_PIN_SET);
}

static void LCD_WriteData(uint8_t *data, uint16_t size)
{
    LCD_DC_HIGH();
    LCD_CS_LOW();
    HAL_SPI_Transmit(&hspi2, data, size, HAL_MAX_DELAY);
    LCD_CS_HIGH();
}

static void LCD_WriteByteData(uint8_t data)
{
    LCD_DC_HIGH();
    LCD_CS_LOW();
    HAL_SPI_Transmit(&hspi2, &data, 1, HAL_MAX_DELAY);
    LCD_CS_HIGH();
}

static void LCD_Reset(void)
{
    LCD_RST_LOW();
    HAL_Delay(20);
    LCD_RST_HIGH();
    HAL_Delay(20);
}

static void LCD_SetAddressWindow(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1)
{
    uint8_t data[4];

    LCD_WriteCommand(ST7789_CASET);
    data[0] = x0 >> 8; data[1] = x0 & 0xFF;
    data[2] = x1 >> 8; data[3] = x1 & 0xFF;
    LCD_WriteData(data, 4);

    LCD_WriteCommand(ST7789_RASET);
    data[0] = y0 >> 8; data[1] = y0 & 0xFF;
    data[2] = y1 >> 8; data[3] = y1 & 0xFF;
    LCD_WriteData(data, 4);

    LCD_WriteCommand(ST7789_RAMWR);
}

void LCD_SetRotation(uint8_t rot)
{
    uint8_t madctl = 0x00;

    switch (rot)
    {
        case 0: madctl = 0x00; lcd_width = 240; lcd_height = 320; break;
        case 1: madctl = 0x60; lcd_width = 320; lcd_height = 240; break;
        case 2: madctl = 0xC0; lcd_width = 240; lcd_height = 320; break;
        case 3: madctl = 0xA0; lcd_width = 320; lcd_height = 240; break;
        default: madctl = 0x00; lcd_width = 240; lcd_height = 320; break;
    }

    LCD_WriteCommand(ST7789_MADCTL);
    LCD_WriteByteData(madctl);
}

void LCD_Init(void)
{
    LCD_CS_HIGH();
    LCD_BL_ON();
    LCD_Reset();

    LCD_WriteCommand(ST7789_SWRESET);
    HAL_Delay(150);

    LCD_WriteCommand(ST7789_SLPOUT);
    HAL_Delay(120);

    LCD_WriteCommand(ST7789_COLMOD);
    LCD_WriteByteData(0x55);
    HAL_Delay(10);

    LCD_WriteCommand(ST7789_MADCTL);
    LCD_WriteByteData(0x00);

    LCD_WriteCommand(ST7789_NORON);
    HAL_Delay(10);

    LCD_WriteCommand(ST7789_DISPON);
    HAL_Delay(120);

    LCD_SetRotation(0);
    LCD_FillScreen(LCD_BLACK);
}

void LCD_DrawPixel(uint16_t x, uint16_t y, uint16_t color)
{
    if (x >= lcd_width || y >= lcd_height) return;

    uint8_t data[2] = {color >> 8, color & 0xFF};
    LCD_SetAddressWindow(x, y, x, y);
    LCD_WriteData(data, 2);
}

void LCD_FillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color)
{
    if (x >= lcd_width || y >= lcd_height) return;
    if ((x + w) > lcd_width)  w = lcd_width - x;
    if ((y + h) > lcd_height) h = lcd_height - y;

    LCD_SetAddressWindow(x, y, x + w - 1, y + h - 1);

    uint8_t line_buf[480];
    uint8_t hi = color >> 8;
    uint8_t lo = color & 0xFF;

    for (uint16_t i = 0; i < w; i++) {
        line_buf[i * 2]     = hi;
        line_buf[i * 2 + 1] = lo;
    }

    LCD_DC_HIGH();
    LCD_CS_LOW();

    for (uint16_t j = 0; j < h; j++) {
        HAL_SPI_Transmit(&hspi2, line_buf, w * 2, HAL_MAX_DELAY);
    }

    LCD_CS_HIGH();
}

void LCD_FillScreen(uint16_t color)
{
    LCD_FillRect(0, 0, lcd_width, lcd_height, color);
}

void LCD_DrawRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color)
{
    LCD_FillRect(x, y, w, 1, color);
    LCD_FillRect(x, y + h - 1, w, 1, color);
    LCD_FillRect(x, y, 1, h, color);
    LCD_FillRect(x + w - 1, y, 1, h, color);
}

void LCD_DrawChar(uint16_t x, uint16_t y, char ch, uint16_t color, uint16_t bg, uint8_t size)
{
    if (ch < 32 || ch > 126) ch = '?';
    const uint8_t *bitmap = font5x7[ch - 32];

    uint16_t w = 6 * size;
    uint16_t h = 8 * size;

    uint16_t buf[6 * 8 * 9];
    uint8_t  tx_buf[6 * 8 * 9 * 2];
    uint32_t idx = 0;

    for (uint8_t row = 0; row < 8; row++)
    {
        for (uint8_t sy = 0; sy < size; sy++)
        {
            for (uint8_t col = 0; col < 6; col++)
            {
                uint16_t pix = bg;

                if (col < 5)
                {
                    if (bitmap[col] & (1 << row))
                        pix = color;
                }

                for (uint8_t sx = 0; sx < size; sx++)
                {
                    buf[idx++] = pix;
                }
            }
        }
    }

    LCD_SetAddressWindow(x, y, x + w - 1, y + h - 1);

    for (uint32_t i = 0; i < idx; i++)
    {
        tx_buf[2 * i]     = buf[i] >> 8;
        tx_buf[2 * i + 1] = buf[i] & 0xFF;
    }

    LCD_DC_HIGH();
    LCD_CS_LOW();
    HAL_SPI_Transmit(&hspi2, tx_buf, idx * 2, HAL_MAX_DELAY);
    LCD_CS_HIGH();
}

void LCD_DrawString(uint16_t x, uint16_t y, const char *str, uint16_t color, uint16_t bg, uint8_t size)
{
    while (*str)
    {
        LCD_DrawChar(x, y, *str, color, bg, size);
        x += 6 * size;
        str++;
    }
}

/* =========================
   UI helpers
   ========================= */
static void LCD_ClearArea(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t bg)
{
    LCD_FillRect(x, y, w, h, bg);
}

static void LCD_DrawCard(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t bg, uint16_t border)
{
    LCD_FillRect(x, y, w, h, bg);
    LCD_DrawRect(x, y, w, h, border);

    // highlight trên
    LCD_FillRect(x + 1, y + 1, w - 2, 1, LCD_LIGHTGRAY);

    // shadow dưới
    LCD_FillRect(x + 1, y + h - 2, w - 2, 1, LCD_BLACK);
}

static void LCD_DrawMetricTemplate(uint16_t x, uint16_t y, const char *title, uint16_t color)
{
	 uint16_t x_center;

	    LCD_DrawCard(x, y, 108, 72, LCD_PANEL, LCD_BORDER);

	    x_center = center_text_x(x, 108, title, 1);
	    LCD_DrawString(x_center, y + 8, title, color, LCD_PANEL, 1);
}

static uint16_t center_text_x(uint16_t card_x, uint16_t card_w, const char *txt, uint8_t size)
{
    uint16_t text_w = (uint16_t)(strlen(txt) * 6 * size);
    if (text_w >= card_w) return card_x;
    return card_x + (card_w - text_w) / 2;
}

/* =========================
   UI layout
   ========================= */
void LCD_UI_Init(void)
{
    LCD_Init();
    LCD_FillScreen(LCD_BG);

    LCD_FillRect(0, 0, 240, 28, 0x001F);
    uint16_t x = (220 - (strlen("AIR QUALITY SYSTEM") * 6)) / 2;
    LCD_DrawString(x, 8, "AIR QUALITY SYSTEM", 0xFFFF, 0x001F, 1);

    LCD_DrawCard(8, 36, 224, 22, LCD_PANEL_2, LCD_BORDER);

    LCD_DrawMetricTemplate(8,   68,  "PM2.5", LCD_PM_COLOR);
    LCD_DrawMetricTemplate(124, 68,  "Temperature",  LCD_TEMP_COLOR);

    LCD_DrawMetricTemplate(8,   148, "Humidity",   LCD_HUMI_COLOR);
    LCD_DrawMetricTemplate(124, 148, "Pressure",  LCD_PRES_COLOR);

    LCD_DrawMetricTemplate(66,  228, "Ultraviolet(UV)",    LCD_UV_COLOR);
}

void LCD_UpdateDateTime(uint8_t date, uint8_t month, uint8_t year, uint8_t hours, uint8_t minutes)
{
    static char old_str[24] = "";
    char new_str[24];
    uint16_t x;

    snprintf(new_str, sizeof(new_str), "%02u/%02u/20%02u   %02u:%02u",
             date, month, year, hours, minutes);

    if (strcmp(new_str, old_str) == 0) return;

    LCD_ClearArea(12, 42, 216, 12, LCD_PANEL_2);
    x = center_text_x(12, 216, new_str, 1);
    LCD_DrawString(x, 44, new_str, LCD_WHITE, LCD_PANEL_2, 1);

    strcpy(old_str, new_str);
}

void LCD_UpdatePM25(uint16_t pm25, uint8_t valid)
{
    static char old_str[20] = "";
    char new_str[20];
    uint16_t x;

    if (valid) snprintf(new_str, sizeof(new_str), "%u ug/m3", pm25);
    else       strcpy(new_str, "--ug/m3");

    if (strcmp(new_str, old_str) == 0) return;

    LCD_ClearArea(20, 98, 80, 16, LCD_PANEL);
     x = center_text_x(10, 96, new_str, 2);
    LCD_DrawString(x, 100, new_str, LCD_PM_COLOR, LCD_PANEL, 2);

    strcpy(old_str, new_str);
}

void LCD_UpdateTemp(float temp)
{
    static char old_str[20] = "";
    char new_str[20];
    uint16_t x;

    snprintf(new_str, sizeof(new_str), "%.1f C", temp);

    if (strcmp(new_str, old_str) == 0) return;

    LCD_ClearArea(136, 98, 80, 16, LCD_PANEL);
     x = center_text_x(126, 96, new_str, 2);
    LCD_DrawString(x, 100, new_str, LCD_TEMP_COLOR, LCD_PANEL, 2);

    strcpy(old_str, new_str);
}

void LCD_UpdateHumi(float humi)
{
    static char old_str[20] = "";
    char new_str[20];
    uint16_t x;

    snprintf(new_str, sizeof(new_str), "%.1f %%", humi);

    if (strcmp(new_str, old_str) == 0) return;

    /* Xoá đúng toàn bộ vùng value của card Humidity */
    LCD_ClearArea(10, 178, 96, 16, LCD_PANEL);

    /* Căn giữa trong chính vùng vừa xoá */
    x = center_text_x(10, 96, new_str, 2);
    LCD_DrawString(x, 180, new_str, LCD_HUMI_COLOR, LCD_PANEL, 2);

    strcpy(old_str, new_str);
}

void LCD_UpdatePres(float pres)
{
    static char old_num[16] = "";
    static char old_unit[8] = "hPa";
    char num_str[16];
    uint16_t  x_unit;

    snprintf(num_str, sizeof(num_str), "%.0f", pres);
    if (strcmp(num_str, old_num) == 0) return;

    /* clear vùng value */
    LCD_ClearArea(130, 176, 92, 22, LCD_PANEL);

    /* ==== tính tổng width để căn giữa cả cụm ==== */
    uint16_t num_w   = strlen(num_str) * 6 * 2;
    uint16_t unit_w  = 3 * 6 * 1;   // "hPa" size 1
    uint16_t spacing = 4;

    uint16_t total_w = num_w + spacing + unit_w;

    /* bắt đầu từ giữa ô */
    uint16_t x_start = center_text_x(126, 96, "", 1) - total_w / 2;

    /* ==== vẽ số ==== */
    LCD_DrawString(x_start, 176, num_str, LCD_PRES_COLOR, LCD_PANEL, 2);

    /* ==== vị trí hPa ==== */
     x_unit = x_start + num_w + spacing;

    /* ==== vẽ hPa giả lập size 1.5 ==== */
    LCD_DrawString(x_unit,     182, "hPa", LCD_PRES_COLOR, LCD_PANEL, 2);
    //LCD_DrawString(x_unit + 1, 182, "hPa", LCD_TEXT_DIM, LCD_PANEL, 1);

    strcpy(old_num, num_str);
    strcpy(old_unit, "hPa");
}

void LCD_UpdateUV(float uv)
{
    static char old_str[20] = "";
    char new_str[20];
    uint16_t x;
    uint16_t bw;

    snprintf(new_str, sizeof(new_str), "%.1f IDX", uv);
    if (strcmp(new_str, old_str) == 0) return;

    LCD_ClearArea(80, 258, 80, 16, LCD_PANEL);
  x = center_text_x(66, 108, new_str, 2);
    LCD_DrawString(x, 260, new_str, LCD_UV_COLOR, LCD_PANEL, 2);

    LCD_FillRect(92, 282, 56, 4, LCD_PANEL_2);
    bw = (uv >= 11.0f) ? 56 : (uint16_t)(uv * 56.0f / 11.0f);
    LCD_FillRect(92, 282, bw, 4, LCD_UV_COLOR);

    strcpy(old_str, new_str);
}
