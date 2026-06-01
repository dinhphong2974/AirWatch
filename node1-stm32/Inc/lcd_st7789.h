#ifndef __LCD_ST7789_H
#define __LCD_ST7789_H

#include "main.h"
#include <stdint.h>

/* LCD size */
#define LCD_WIDTH   240
#define LCD_HEIGHT  320

/* PIN CONFIG */
#define LCD_CS_PORT     GPIOB
#define LCD_CS_PIN      GPIO_PIN_12

#define LCD_DC_PORT     GPIOB
#define LCD_DC_PIN      GPIO_PIN_11

#define LCD_RST_PORT    GPIOB
#define LCD_RST_PIN     GPIO_PIN_10

#define LCD_BL_PORT     GPIOA
#define LCD_BL_PIN      GPIO_PIN_11

extern SPI_HandleTypeDef hspi2;

/* RGB565 colors */
#define LCD_BLACK         0x0000
#define LCD_WHITE         0xFFFF
#define LCD_RED           0xF800
#define LCD_GREEN         0x07E0
#define LCD_BLUE          0x001F
#define LCD_YELLOW        0xFFE0
#define LCD_CYAN          0x07FF
#define LCD_MAGENTA       0xF81F
#define LCD_ORANGE        0xFD20
#define LCD_GRAY          0x8410
#define LCD_LIGHTGRAY     0xC618
#define LCD_DARKBLUE      0x0011

/* Theme */
#define LCD_BG        0x0000   // nền đen sâu (AMOLED style)
#define LCD_PANEL     0x1082   // xám đậm
#define LCD_PANEL_2   0x18E3

#define LCD_BORDER    0x39E7   // viền sáng hơn

#define LCD_TEXT_DIM  0x7BEF   // chữ phụ

#define LCD_TEMP_COLOR    0xFD20
#define LCD_HUMI_COLOR    0x07FF
#define LCD_PRES_COLOR    0x07E0
#define LCD_UV_COLOR      0xFFE0
#define LCD_PM_COLOR      0xF800

typedef struct
{
    uint16_t pm25;
    float temperature;
    float humidity;
    float pressure;
    float uv;
    uint8_t date;
    uint8_t month;
    uint8_t year;
    uint8_t hours;
    uint8_t minutes;
    uint8_t has_pm25;
} LCD_Data_t;

/* Core */
void LCD_Init(void);
void LCD_SetRotation(uint8_t rot);
void LCD_FillScreen(uint16_t color);
void LCD_DrawPixel(uint16_t x, uint16_t y, uint16_t color);
void LCD_FillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color);
void LCD_DrawRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color);
void LCD_DrawChar(uint16_t x, uint16_t y, char ch, uint16_t color, uint16_t bg, uint8_t size);
void LCD_DrawString(uint16_t x, uint16_t y, const char *str, uint16_t color, uint16_t bg, uint8_t size);

/* UI */
void LCD_UI_Init(void);
void LCD_UpdateDateTime(uint8_t date, uint8_t month, uint8_t year, uint8_t hours, uint8_t minutes);
void LCD_UpdatePM25(uint16_t pm25, uint8_t valid);
void LCD_UpdateTemp(float temp);
void LCD_UpdateHumi(float humi);
void LCD_UpdatePres(float pres);
void LCD_UpdateUV(float uv);

#endif
