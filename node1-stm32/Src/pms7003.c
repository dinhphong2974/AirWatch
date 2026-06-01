#include "pms7003.h"

/* ========================= USER-ADJUSTABLE TIMING ========================= */
/* Debug ngắn để xem Live Watch */


// Khi chạy thật 24/24 có thể đổi ví dụ:
   #define PMS_SLEEP_TIME_MS      110000UL
   #define PMS_STABILIZE_TIME_MS  10000UL
   #define PMS_SAMPLE_TARGET      1


/* ============================== PMS FRAME ================================= */
#define PMS_FRAME_HEADER_1   0x42
#define PMS_FRAME_HEADER_2   0x4D
#define PMS_FRAME_SIZE       32
#define PMS_DATA_LENGTH      28

/* PM2.5 atmospheric ở byte 12,13 trong frame 32 byte */
#define PMS_PM25_H_BYTE_INDEX   12
#define PMS_PM25_L_BYTE_INDEX   13

/* ============================== STATIC VAR ================================= */
static UART_HandleTypeDef *pms_huart = NULL;

static uint8_t rx_buffer[PMS_FRAME_SIZE];
static uint8_t rx_index = 0;

static uint8_t frame_valid = 0;
static uint16_t latest_pm25 = 0;

static PMS_Runtime_t pms_runtime = {0};

static uint32_t state_timestamp = 0;
static uint32_t pm25_sum = 0;

/* ============================ LOCAL FUNCTIONS ============================== */
static uint16_t PMS_CombineBytes(uint8_t msb, uint8_t lsb)
{
    return ((uint16_t)msb << 8) | lsb;
}

static void PMS_SetState(PMS_State_t new_state)
{
    pms_runtime.state = new_state;
    state_timestamp = HAL_GetTick();
}

static void PMS_ResetCollectData(void)
{
    pm25_sum = 0;
    pms_runtime.sample_count = 0;
}

static void PMS_SendCommand(uint8_t cmd3, uint8_t dataH, uint8_t dataL)
{
    /* frame command 7 byte của Plantower:
       0: 0x42
       1: 0x4D
       2: cmd
       3: dataH
       4: dataL
       5: checksumH
       6: checksumL
    */
    uint8_t cmd[7];
    uint16_t checksum;

    cmd[0] = 0x42;
    cmd[1] = 0x4D;
    cmd[2] = cmd3;
    cmd[3] = dataH;
    cmd[4] = dataL;

    checksum = cmd[0] + cmd[1] + cmd[2] + cmd[3] + cmd[4];

    cmd[5] = (uint8_t)(checksum >> 8);
    cmd[6] = (uint8_t)(checksum & 0xFF);

    HAL_UART_Transmit(pms_huart, cmd, 7, 100);
}

/* ============================== API ======================================= */
void PMS_Init(UART_HandleTypeDef *huart)
{
    pms_huart = huart;

    PMS_ResetParser();

    frame_valid = 0;
    latest_pm25 = 0;

    pms_runtime.pm25_instant = 0;
    pms_runtime.pm25_average = 0;
    pms_runtime.data_valid = 0;
    pms_runtime.new_average_ready = 0;
    pms_runtime.sample_count = 0;
    pms_runtime.state = PMS_STATE_WAKEUP;

    PMS_ResetCollectData();
    state_timestamp = HAL_GetTick();

    /* Khởi động đầu tiên: wake để vào chu kỳ đo */
    PMS_WakeUp();
    PMS_SetState(PMS_STATE_STABILIZE);
}

void PMS_ResetParser(void)
{
    rx_index = 0;
}

void PMS_WakeUp(void)
{
    /* Active mode / wake */
    PMS_SendCommand(0xE4, 0x00, 0x01);
}

void PMS_Sleep(void)
{
    /* Sleep */
    PMS_SendCommand(0xE4, 0x00, 0x00);
}

void PMS_ProcessByte(uint8_t byte)
{
    switch (rx_index)
    {
        case 0:
            if (byte == PMS_FRAME_HEADER_1)
            {
                rx_buffer[rx_index++] = byte;
            }
            break;

        case 1:
            if (byte == PMS_FRAME_HEADER_2)
            {
                rx_buffer[rx_index++] = byte;
            }
            else
            {
                rx_index = 0;
            }
            break;

        default:
            rx_buffer[rx_index++] = byte;

            if (rx_index >= PMS_FRAME_SIZE)
            {
                uint16_t frame_length;
                uint16_t received_checksum;
                uint16_t calculated_checksum = 0;
                uint8_t i;

                frame_length = PMS_CombineBytes(rx_buffer[2], rx_buffer[3]);

                if (frame_length == PMS_DATA_LENGTH)
                {
                    for (i = 0; i < PMS_FRAME_SIZE - 2; i++)
                    {
                        calculated_checksum += rx_buffer[i];
                    }

                    received_checksum = PMS_CombineBytes(rx_buffer[30], rx_buffer[31]);

                    if (calculated_checksum == received_checksum)
                    {
                        latest_pm25 = PMS_CombineBytes(
                            rx_buffer[PMS_PM25_H_BYTE_INDEX],
                            rx_buffer[PMS_PM25_L_BYTE_INDEX]
                        );

                        pms_runtime.pm25_instant = latest_pm25;
                        frame_valid = 1;
                    }
                    else
                    {
                        frame_valid = 0;
                    }
                }
                else
                {
                    frame_valid = 0;
                }

                rx_index = 0;
            }
            break;
    }
}

void PMS_Task(void)
{
    uint32_t now = HAL_GetTick();

    switch (pms_runtime.state)
    {
        case PMS_STATE_SLEEP:
            if ((now - state_timestamp) >= PMS_SLEEP_TIME_MS)
            {
                PMS_WakeUp();
                PMS_SetState(PMS_STATE_STABILIZE);
            }
            break;

        case PMS_STATE_WAKEUP:
            /* trạng thái này đang không dùng riêng, đã gộp luôn sang STABILIZE */
            PMS_SetState(PMS_STATE_STABILIZE);
            break;

        case PMS_STATE_STABILIZE:
            if ((now - state_timestamp) >= PMS_STABILIZE_TIME_MS)
            {
                PMS_ResetCollectData();
                pms_runtime.data_valid = 0;
                frame_valid = 0;
                PMS_SetState(PMS_STATE_COLLECT);
            }
            break;

        case PMS_STATE_COLLECT:
            if (frame_valid)
            {
                frame_valid = 0;  // consume 1 frame hợp lệ

                pm25_sum += latest_pm25;
                pms_runtime.sample_count++;

                if (pms_runtime.sample_count >= PMS_SAMPLE_TARGET)
                {
                    pms_runtime.pm25_average = (uint16_t)(pm25_sum / PMS_SAMPLE_TARGET);
                    pms_runtime.data_valid = 1;
                    pms_runtime.new_average_ready = 1;

                    PMS_Sleep();
                    PMS_SetState(PMS_STATE_SLEEP);
                }
            }
            break;

        default:
            PMS_Sleep();
            PMS_SetState(PMS_STATE_SLEEP);
            break;
    }
}

uint16_t PMS_GetPM25_Instant(void)
{
    return pms_runtime.pm25_instant;
}

uint16_t PMS_GetPM25_Average(void)
{
    return pms_runtime.pm25_average;
}

uint8_t PMS_IsAverageReady(void)
{
    return pms_runtime.new_average_ready;
}

void PMS_ClearAverageFlag(void)
{
    pms_runtime.new_average_ready = 0;
}

PMS_Runtime_t PMS_GetRuntime(void)
{
    return pms_runtime;
}
