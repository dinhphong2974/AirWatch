#ifndef __DS3231_H
#define __DS3231_H

#include "stm32f1xx_hal.h"   // đổi sang f4xx, l4xx nếu bạn dùng dòng khác

/* ================= I2C ADDRESS ================= */
#define DS3231_I2C_ADDR   (0x68 << 1)   // HAL dùng 8-bit address

/* ================= REGISTER MAP ================= */
#define DS3231_REG_SECONDS   0x00
#define DS3231_REG_MINUTES   0x01
#define DS3231_REG_HOURS     0x02
#define DS3231_REG_DAY       0x03
#define DS3231_REG_DATE      0x04
#define DS3231_REG_MONTH     0x05
#define DS3231_REG_YEAR      0x06
#define DS3231_REG_CONTROL   0x0E
#define DS3231_REG_STATUS    0x0F

/* ================= STRUCT TIME ================= */
typedef struct
{
    uint8_t seconds;
    uint8_t minutes;
    uint8_t hours;
    uint8_t day;     // 1–7
    uint8_t date;    // 1–31
    uint8_t month;   // 1–12
    uint8_t year;    // 0–99
} DS3231_Time_t;

/* ================= API ================= */
HAL_StatusTypeDef DS3231_Init(I2C_HandleTypeDef *hi2c);
HAL_StatusTypeDef DS3231_SetTime(I2C_HandleTypeDef *hi2c, DS3231_Time_t *time);
HAL_StatusTypeDef DS3231_GetTime(I2C_HandleTypeDef *hi2c, DS3231_Time_t *time);
HAL_StatusTypeDef DS3231_ReadOSF(I2C_HandleTypeDef *hi2c, uint8_t *osf);
HAL_StatusTypeDef DS3231_ClearOSF(I2C_HandleTypeDef *hi2c);
HAL_StatusTypeDef DS3231_EnableOscillator(I2C_HandleTypeDef *hi2c);

/* ================= UTILS ================= */
uint8_t DS3231_DecToBCD(uint8_t dec);
uint8_t DS3231_BCDToDec(uint8_t bcd);

#endif
