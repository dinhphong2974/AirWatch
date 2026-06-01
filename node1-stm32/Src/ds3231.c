#include "ds3231.h"

/* ================= BCD UTILS ================= */
uint8_t DS3231_DecToBCD(uint8_t dec)
{
    return ((dec / 10) << 4) | (dec % 10);
}

uint8_t DS3231_BCDToDec(uint8_t bcd)
{
    return ((bcd >> 4) * 10) + (bcd & 0x0F);
}

/* ================= INIT ================= */
HAL_StatusTypeDef DS3231_Init(I2C_HandleTypeDef *hi2c)
{
    uint8_t status;

    /* Ensure oscillator enabled */
    if (DS3231_EnableOscillator(hi2c) != HAL_OK)
        return HAL_ERROR;

    /* Read STATUS */
    if (HAL_I2C_Mem_Read(hi2c, DS3231_I2C_ADDR,
                         DS3231_REG_STATUS,
                         I2C_MEMADD_SIZE_8BIT,
                         &status, 1, HAL_MAX_DELAY) != HAL_OK)
    {
        return HAL_ERROR;
    }

    /* Clear OSF if set */
    if (status & 0x80)
    {
        status &= ~(0x80);
        if (HAL_I2C_Mem_Write(hi2c, DS3231_I2C_ADDR,
                              DS3231_REG_STATUS,
                              I2C_MEMADD_SIZE_8BIT,
                              &status, 1, HAL_MAX_DELAY) != HAL_OK)
        {
            return HAL_ERROR;
        }
    }

    return HAL_OK;
}

/* ================= SET TIME ================= */
HAL_StatusTypeDef DS3231_SetTime(I2C_HandleTypeDef *hi2c, DS3231_Time_t *time)
{
    uint8_t buffer[7];

    buffer[0] = DS3231_DecToBCD(time->seconds) & 0x7F;
    buffer[1] = DS3231_DecToBCD(time->minutes) & 0x7F;
    buffer[2] = DS3231_DecToBCD(time->hours)   & 0x3F; // 24h
    buffer[3] = DS3231_DecToBCD(time->day);
    buffer[4] = DS3231_DecToBCD(time->date);
    buffer[5] = DS3231_DecToBCD(time->month);
    buffer[6] = DS3231_DecToBCD(time->year);

    /* Ghi liên tục từ register 0x00 */
    return HAL_I2C_Mem_Write(hi2c, DS3231_I2C_ADDR,
                             DS3231_REG_SECONDS,
                             I2C_MEMADD_SIZE_8BIT,
                             buffer, 7, HAL_MAX_DELAY);
}

/* ================= GET TIME ================= */
HAL_StatusTypeDef DS3231_GetTime(I2C_HandleTypeDef *hi2c, DS3231_Time_t *time)
{
    uint8_t buffer[7];

    /* Đọc liên tục 7 byte từ 0x00 */
    if (HAL_I2C_Mem_Read(hi2c, DS3231_I2C_ADDR,
                         DS3231_REG_SECONDS,
                         I2C_MEMADD_SIZE_8BIT,
                         buffer, 7, HAL_MAX_DELAY) != HAL_OK)
    {
        return HAL_ERROR;
    }

    time->seconds = DS3231_BCDToDec(buffer[0] & 0x7F);
    time->minutes = DS3231_BCDToDec(buffer[1]);
    time->hours   = DS3231_BCDToDec(buffer[2] & 0x3F); // 24h
    time->day     = DS3231_BCDToDec(buffer[3]);
    time->date    = DS3231_BCDToDec(buffer[4]);
    time->month   = DS3231_BCDToDec(buffer[5] & 0x1F);
    time->year    = DS3231_BCDToDec(buffer[6]);

    return HAL_OK;
}

/* ================= CLEAR OSF ================= */
HAL_StatusTypeDef DS3231_ClearOSF(I2C_HandleTypeDef *hi2c)
{
    uint8_t status;

    if (HAL_I2C_Mem_Read(hi2c, DS3231_I2C_ADDR,
                         DS3231_REG_STATUS,
                         I2C_MEMADD_SIZE_8BIT,
                         &status, 1, HAL_MAX_DELAY) != HAL_OK)
    {
        return HAL_ERROR;
    }

    status &= ~(0x80);

    return HAL_I2C_Mem_Write(hi2c, DS3231_I2C_ADDR,
                             DS3231_REG_STATUS,
                             I2C_MEMADD_SIZE_8BIT,
                             &status, 1, HAL_MAX_DELAY);
}
HAL_StatusTypeDef DS3231_ReadOSF(I2C_HandleTypeDef *hi2c, uint8_t *osf)
{
    uint8_t status;

    if (HAL_I2C_Mem_Read(hi2c,
                         DS3231_I2C_ADDR,
                         DS3231_REG_STATUS,
                         I2C_MEMADD_SIZE_8BIT,
                         &status,
                         1,
                         HAL_MAX_DELAY) != HAL_OK)
    {
        return HAL_ERROR;
    }

    *osf = (status & 0x80) ? 1 : 0;

    return HAL_OK;
}
HAL_StatusTypeDef DS3231_EnableOscillator(I2C_HandleTypeDef *hi2c)
{
    uint8_t ctrl;

    /* Read CONTROL (0x0E) */
    if (HAL_I2C_Mem_Read(hi2c, DS3231_I2C_ADDR,
                         DS3231_REG_CONTROL,
                         I2C_MEMADD_SIZE_8BIT,
                         &ctrl, 1, HAL_MAX_DELAY) != HAL_OK)
    {
        return HAL_ERROR;
    }

    /* Clear EOSC bit7 => ensure oscillator is running */
    ctrl &= ~(0x80);

    if (HAL_I2C_Mem_Write(hi2c, DS3231_I2C_ADDR,
                          DS3231_REG_CONTROL,
                          I2C_MEMADD_SIZE_8BIT,
                          &ctrl, 1, HAL_MAX_DELAY) != HAL_OK)
    {
        return HAL_ERROR;
    }

    return HAL_OK;
}
