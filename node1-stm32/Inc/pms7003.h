#ifndef PMS7003_H
#define PMS7003_H

#include "stm32f1xx_hal.h"
#include <stdint.h>

typedef enum
{
    PMS_STATE_SLEEP = 0,
    PMS_STATE_WAKEUP,
    PMS_STATE_STABILIZE,
    PMS_STATE_COLLECT
} PMS_State_t;

typedef struct
{
    uint16_t pm25_instant;     // mẫu mới nhất
    uint16_t pm25_average;     // trung bình chu kỳ đo gần nhất
    uint8_t  data_valid;       // dữ liệu chu kỳ gần nhất hợp lệ
    uint8_t  new_average_ready;// có dữ liệu trung bình mới
    PMS_State_t state;         // trạng thái hiện tại
    uint8_t  sample_count;     // số mẫu đã lấy trong chu kỳ hiện tại
} PMS_Runtime_t;

void PMS_Init(UART_HandleTypeDef *huart);
void PMS_ProcessByte(uint8_t byte);
void PMS_Task(void);

uint16_t PMS_GetPM25_Instant(void);
uint16_t PMS_GetPM25_Average(void);
uint8_t PMS_IsAverageReady(void);
void PMS_ClearAverageFlag(void);

PMS_Runtime_t PMS_GetRuntime(void);

/* command */
void PMS_WakeUp(void);
void PMS_Sleep(void);

/* parser */
void PMS_ResetParser(void);

#endif
