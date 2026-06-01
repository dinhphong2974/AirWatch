#ifndef SX1278_H
#define SX1278_H

#include "stm32f1xx_hal.h"
#include <stdint.h>

typedef struct
{
    SPI_HandleTypeDef *hspi;

    GPIO_TypeDef *nss_port;
    uint16_t nss_pin;

    GPIO_TypeDef *reset_port;
    uint16_t reset_pin;

    uint32_t frequency;
} SX1278_HandleTypeDef;

HAL_StatusTypeDef SX1278_Init(SX1278_HandleTypeDef *dev);
HAL_StatusTypeDef SX1278_Send(SX1278_HandleTypeDef *dev, uint8_t *data, uint8_t len, uint32_t timeout);

#endif
