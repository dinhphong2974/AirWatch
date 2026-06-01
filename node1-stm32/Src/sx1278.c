#include "sx1278.h"

/* Registers */
#define REG_FIFO                    0x00
#define REG_OP_MODE                 0x01
#define REG_FRF_MSB                 0x06
#define REG_FRF_MID                 0x07
#define REG_FRF_LSB                 0x08
#define REG_PA_CONFIG               0x09
#define REG_LNA                     0x0C
#define REG_FIFO_ADDR_PTR           0x0D
#define REG_FIFO_TX_BASE_ADDR       0x0E
#define REG_FIFO_RX_BASE_ADDR       0x0F
#define REG_IRQ_FLAGS               0x12
#define REG_RX_NB_BYTES             0x13
#define REG_PKT_SNR_VALUE           0x19
#define REG_PKT_RSSI_VALUE          0x1A
#define REG_MODEM_CONFIG_1          0x1D
#define REG_MODEM_CONFIG_2          0x1E
#define REG_PREAMBLE_MSB            0x20
#define REG_PREAMBLE_LSB            0x21
#define REG_PAYLOAD_LENGTH          0x22
#define REG_MODEM_CONFIG_3          0x26
#define REG_SYNC_WORD               0x39
#define REG_DIO_MAPPING_1           0x40
#define REG_VERSION                 0x42

/* Modes */
#define MODE_LONG_RANGE_MODE        0x80
#define MODE_SLEEP                  0x00
#define MODE_STDBY                  0x01
#define MODE_TX                     0x03
#define MODE_RX_CONTINUOUS          0x05

/* IRQ flags */
#define IRQ_TX_DONE_MASK            0x08
#define IRQ_PAYLOAD_CRC_ERROR_MASK  0x20
#define IRQ_RX_DONE_MASK            0x40



static void SX1278_Select(SX1278_HandleTypeDef *dev)
{
    HAL_GPIO_WritePin(dev->nss_port, dev->nss_pin, GPIO_PIN_RESET);
}

static void SX1278_Unselect(SX1278_HandleTypeDef *dev)
{
    HAL_GPIO_WritePin(dev->nss_port, dev->nss_pin, GPIO_PIN_SET);
}

static void SX1278_Reset(SX1278_HandleTypeDef *dev)
{
    HAL_GPIO_WritePin(dev->reset_port, dev->reset_pin, GPIO_PIN_RESET);
    HAL_Delay(5);
    HAL_GPIO_WritePin(dev->reset_port, dev->reset_pin, GPIO_PIN_SET);
    HAL_Delay(10);
}

static void SX1278_WriteRegister(SX1278_HandleTypeDef *dev, uint8_t reg, uint8_t value)
{
    uint8_t buf[2];
    buf[0] = reg | 0x80;
    buf[1] = value;

    SX1278_Select(dev);
    HAL_SPI_Transmit(dev->hspi, buf, 2, 100);
    SX1278_Unselect(dev);
}

static uint8_t SX1278_ReadRegister(SX1278_HandleTypeDef *dev, uint8_t reg)
{
    uint8_t tx[2];
    uint8_t rx[2];

    tx[0] = reg & 0x7F;
    tx[1] = 0x00;

    SX1278_Select(dev);
    HAL_SPI_TransmitReceive(dev->hspi, tx, rx, 2, 100);
    SX1278_Unselect(dev);

    return rx[1];
}

static void SX1278_WriteBuffer(SX1278_HandleTypeDef *dev, uint8_t reg, uint8_t *data, uint8_t len)
{
    uint8_t addr = reg | 0x80;

    SX1278_Select(dev);
    HAL_SPI_Transmit(dev->hspi, &addr, 1, 100);
    HAL_SPI_Transmit(dev->hspi, data, len, 100);
    SX1278_Unselect(dev);
}

static void SX1278_SetFrequency(SX1278_HandleTypeDef *dev, uint32_t freq)
{
    uint64_t frf = ((uint64_t)freq << 19) / 32000000;

    SX1278_WriteRegister(dev, REG_FRF_MSB, (uint8_t)(frf >> 16));
    SX1278_WriteRegister(dev, REG_FRF_MID, (uint8_t)(frf >> 8));
    SX1278_WriteRegister(dev, REG_FRF_LSB, (uint8_t)(frf >> 0));
}

HAL_StatusTypeDef SX1278_Init(SX1278_HandleTypeDef *dev)
{
    uint8_t version;

    SX1278_Reset(dev);

    version = SX1278_ReadRegister(dev, REG_VERSION);
    if (version != 0x12)
    {
        return HAL_ERROR;
    }

    /* Sleep + LoRa */
    SX1278_WriteRegister(dev, REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_SLEEP);
    HAL_Delay(10);

    /* Frequency */
    SX1278_SetFrequency(dev, dev->frequency);

    /* FIFO base */
    SX1278_WriteRegister(dev, REG_FIFO_TX_BASE_ADDR, 0x00);
    SX1278_WriteRegister(dev, REG_FIFO_RX_BASE_ADDR, 0x00);

    /* LNA boost */
    SX1278_WriteRegister(dev, REG_LNA, 0x23);

    /* Modem config:
       BW = 125kHz
       CR = 4/5
       Explicit header
    */
    SX1278_WriteRegister(dev, REG_MODEM_CONFIG_1, 0x72);

    /* SF = 7, CRC on */
    SX1278_WriteRegister(dev, REG_MODEM_CONFIG_2, 0xC4);

    /* LowDataRateOptimize off, AGC auto on */
    SX1278_WriteRegister(dev, REG_MODEM_CONFIG_3, 0x0C);

    /* Preamble = 8 */
    SX1278_WriteRegister(dev, REG_PREAMBLE_MSB, 0x00);
    SX1278_WriteRegister(dev, REG_PREAMBLE_LSB, 0x08);

    /* Sync word */
    SX1278_WriteRegister(dev, REG_SYNC_WORD, 0x34);

    /* PA boost, output power ~17 dBm */
    SX1278_WriteRegister(dev, REG_PA_CONFIG, 0xFF);

    /* Clear IRQ */
    SX1278_WriteRegister(dev, REG_IRQ_FLAGS, 0xFF);

    /* Standby */
    SX1278_WriteRegister(dev, REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_STDBY);

    return HAL_OK;
}

HAL_StatusTypeDef SX1278_Send(SX1278_HandleTypeDef *dev, uint8_t *data, uint8_t len, uint32_t timeout)
{
    uint32_t tickstart = HAL_GetTick();

    /* Standby */
    SX1278_WriteRegister(dev, REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_STDBY);

    /* FIFO ptr */
    SX1278_WriteRegister(dev, REG_FIFO_ADDR_PTR, 0x00);

    /* Write payload */
    SX1278_WriteBuffer(dev, REG_FIFO, data, len);
    SX1278_WriteRegister(dev, REG_PAYLOAD_LENGTH, len);

    /* Clear IRQ */
    SX1278_WriteRegister(dev, REG_IRQ_FLAGS, 0xFF);

    /* TX mode */
    SX1278_WriteRegister(dev, REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_TX);

    /* Wait TxDone */
    while ((SX1278_ReadRegister(dev, REG_IRQ_FLAGS) & IRQ_TX_DONE_MASK) == 0)
    {
        if ((HAL_GetTick() - tickstart) > timeout)
        {
            return HAL_TIMEOUT;
        }
    }

    /* Clear IRQ */
    SX1278_WriteRegister(dev, REG_IRQ_FLAGS, 0xFF);

    /* Back to standby */
    SX1278_WriteRegister(dev, REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_STDBY);

    return HAL_OK;
}
