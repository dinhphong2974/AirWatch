#include "guva_s12sd.h"

float GUVA_ReadVoltage(ADC_HandleTypeDef *hadc, float vref)
{
    uint32_t adc_raw = 0;
    float voltage = 0.0f;

    HAL_ADC_Start(hadc);
    if (HAL_ADC_PollForConversion(hadc, 100) == HAL_OK)
    {
        adc_raw = HAL_ADC_GetValue(hadc);
    }

    HAL_ADC_Stop(hadc);

    voltage = ((float)adc_raw / 4095.0f) * vref;
    return voltage;
}

float GUVA_ReadUVIndex(ADC_HandleTypeDef *hadc, float vref)
{
    float voltage = GUVA_ReadVoltage(hadc, vref);
    float uv_index = voltage / 0.1f;

    if (uv_index < 0.0f)
        uv_index = 0.0f;

    return uv_index;
}

float GUVA_ReadVoltage_Avg(ADC_HandleTypeDef *hadc, float vref, uint8_t samples)
{
    uint32_t sum = 0;

    for (uint8_t i = 0; i < samples; i++)
    {
        HAL_ADC_Start(hadc);

        if (HAL_ADC_PollForConversion(hadc, 100) == HAL_OK)
        {
            sum += HAL_ADC_GetValue(hadc);
        }

        HAL_ADC_Stop(hadc);
        HAL_Delay(5);
    }

    float adc_avg = (float)sum / samples;
    return (adc_avg / 4095.0f) * vref;
}
