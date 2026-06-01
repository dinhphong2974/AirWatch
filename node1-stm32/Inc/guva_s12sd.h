#ifndef __GUVA_S12SD_H
#define __GUVA_S12SD_H

#include "main.h"

float GUVA_ReadVoltage(ADC_HandleTypeDef *hadc, float vref);
float GUVA_ReadUVIndex(ADC_HandleTypeDef *hadc, float vref);
float GUVA_ReadVoltage_Avg(ADC_HandleTypeDef *hadc, float vref, uint8_t samples);

#endif
