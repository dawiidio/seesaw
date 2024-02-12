import i2c, {PromisifiedBus} from 'i2c-bus';
import {Buffer} from 'node:buffer';

import * as console from "console";
import {createStatusMask} from "~/masks";
import {attinyModel, samd09Model} from "~/models";
import {EnumBitMask} from "~/EnumBitMask";
import {SeesawModel} from "~/SeesawModel";

function datecodeDecode(code: number): [number, number, number] {
    let day = code & 0x1F;
    let month = (code >> 5) & 0x0F;
    let year = ((code >> 9) & 0x7F);
    return [year, month, day];
}

function datecodeEncode(year: number, month: number, day: number) {
    let yearCode = (year % 100) & 0x7F;
    let monthCode = month & 0x0F;
    let dayCode = day & 0x1F;
    return (yearCode << 9) | (monthCode << 5) | dayCode;
}

enum SeesawRegisters {
    STATUS = 0x00,
    GPIO = 0x01,
    SERCOM0 = 0x02,
    SERCOM1 = 0x03,
    SERCOM2 = 0x04,
    SERCOM3 = 0x05,
    SERCOM4 = 0x06,
    SERCOM5 = 0x07,
    TIMER = 0x08,
    ADC = 0x09,
    DAC = 0x0A,
    INTERRUPT = 0x0B,
    DAP = 0x0C,
    EEPROM = 0x0D,
    NEOPIXEL = 0x0E,
    TOUCH = 0x0F,
    KEYPAD = 0x10,
    ENCODER = 0x11
}

enum SeesawSubRegisters {
    GPIO_DIRSET_BULK = 0x02,
    GPIO_DIRCLR_BULK = 0x03,
    GPIO_BULK = 0x04,
    GPIO_BULK_SET = 0x05,
    GPIO_BULK_CLR = 0x06,
    GPIO_BULK_TOGGLE = 0x07,
    GPIO_INTENSET = 0x08,
    GPIO_INTENCLR = 0x09,
    GPIO_INTFLAG = 0x0A,
    GPIO_PULLENSET = 0x0B,
    GPIO_PULLENCLR = 0x0C,
    STATUS_HW_ID = 0x01,
    STATUS_VERSION = 0x02,
    STATUS_OPTIONS = 0x03,
    STATUS_SWRST = 0x7F,
    TIMER_STATUS = 0x00,
    TIMER_PWM = 0x01,
    TIMER_FREQ = 0x02,
    ADC_STATUS = 0x00,
    ADC_INTEN = 0x02,
    ADC_INTENCLR = 0x03,
    ADC_WINMODE = 0x04,
    ADC_WINTHRESH = 0x05,
    ADC_CHANNEL_OFFSET = 0x07,
    SERCOM_STATUS = 0x00,
    SERCOM_INTEN = 0x02,
    SERCOM_INTENCLR = 0x03,
    SERCOM_BAUD = 0x04,
    SERCOM_DATA = 0x05,
    NEOPIXEL_STATUS = 0x00,
    NEOPIXEL_PIN = 0x01,
    NEOPIXEL_SPEED = 0x02,
    NEOPIXEL_BUF_LENGTH = 0x03,
    NEOPIXEL_BUF = 0x04,
    NEOPIXEL_SHOW = 0x05,
    TOUCH_CHANNEL_OFFSET = 0x10,
    HW_ID_CODE = 0x55,
    EEPROM_I2C_ADDR = 0x3F
}

function createBuffer(bytesOrLength?: number[] | number): Buffer {
    if (typeof bytesOrLength === 'undefined') {
        return Buffer.alloc(0);
    } else if (Array.isArray(bytesOrLength)) {
        return Buffer.from(bytesOrLength);
    } else if (typeof bytesOrLength === 'number') {
        return Buffer.alloc(bytesOrLength);
    }

    throw new Error(`Wrong param type. Param: ${bytesOrLength}`);
}

const wait = (delay: number = 5) => new Promise((resolve) => setTimeout(resolve, delay));

export interface SeesawSettings {
    address: number
    bus: PromisifiedBus
}

export enum SeesawPinMode {
    OUTPUT,
    INPUT,
    INPUT_PULLUP,
    INPUT_PULLDOWN,
}

class Seesaw<T extends SeesawModel<any>> {
    constructor(public model: T, public settings: SeesawSettings) {
    }

    async read(register: SeesawRegisters, subRegister: SeesawSubRegisters, readBufferOrSize: Buffer | number) {
        const readBuffer = typeof readBufferOrSize === 'number' ? createBuffer(readBufferOrSize) : readBufferOrSize;

        await this.write(register, subRegister);
        await wait();

        await this.settings.bus.i2cRead(this.settings.address, readBuffer.length, readBuffer);
        return readBuffer;
    }

    async write(register: SeesawRegisters, subRegister: SeesawSubRegisters, data: Buffer = createBuffer()) {
        const i2cHeader = Buffer.from([register, subRegister]);
        const i2cFrame = Buffer.concat([i2cHeader, data], i2cHeader.length + data.length);

        await this.settings.bus.i2cWrite(this.settings.address, i2cFrame.length, i2cFrame);
    }

    async version() {
        const data = await this.read(SeesawRegisters.STATUS, SeesawSubRegisters.STATUS_VERSION, 4);

        const serial = data.readInt16BE(0);
        const buildDate = datecodeDecode(data.readInt16BE(2));

        return {
            serial,
            buildDate
        }
    }

    async options() {
        const data = await this.read(SeesawRegisters.STATUS, SeesawSubRegisters.STATUS_OPTIONS, 4);
        const enumBitMask = createStatusMask();
        enumBitMask.setNumberValue(data.readInt32BE());

        return enumBitMask.enumValue;
    }

    async gpioStatus(): Promise<ReturnType<T["pinMaskFactory"]>> {
        const data = await this.read(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_BULK, 4);
        const enumBitMask = this.model.pinMaskFactory();
        enumBitMask.setNumberValue(data.readInt32BE());

        return enumBitMask;
    }

    async gpioWrite(data: ReturnType<T["pinMaskFactory"]>) {
        await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_BULK, data.toBuffer());
    }

    // todo test it
    async pinMode(pin: keyof ReturnType<T["pinMaskFactory"]>["enumValue"], mode: SeesawPinMode) {
        const pinsBitMask = this.model.pinMaskFactory();
        pinsBitMask.set(pin, 1);
        const buf = pinsBitMask.toBuffer();

        switch (mode) {
            case SeesawPinMode.OUTPUT:
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_DIRSET_BULK, buf);
                break;
            case SeesawPinMode.INPUT:
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_DIRCLR_BULK, buf);
                break;
            case SeesawPinMode.INPUT_PULLUP:
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_DIRCLR_BULK, buf);
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_PULLENSET, buf);
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_BULK_SET, buf);
                break;
            case SeesawPinMode.INPUT_PULLDOWN:
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_DIRCLR_BULK, buf);
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_PULLENSET, buf);
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_BULK_CLR, buf);
                break;
        }
    }
}

async function main() {
    const address = 0x49;

    const i2cBus = await i2c.openPromisified(1);

    const device = new Seesaw(attinyModel,{
        bus: i2cBus,
        address,
    });

    // (await device.gpioStatus());
    // (await device.options())

    // console.log(await device.version());
    // console.log(await device.options());
    // console.log(status);

    await device.pinMode('PB5', SeesawPinMode.OUTPUT);

    const status = await device.gpioStatus();
    console.log('status >', status);
    // status.set('PB5', 1);

    // await device.gpioWrite(status);

    await device.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_BULK_SET, Buffer.from([8]));

    await wait(10);
    const updatedStatus = await device.gpioStatus();

    // todo mapping pol na nazwy moze byc zbedny, poslugujemy sie numerkami
    // todo zmienic stan jakiegos pinu, nie wiem czy dobrze je odczytuje zapisuje, nie wiem kiedy to jest le a kiedy be

    console.log('updated status >', updatedStatus);

    console.log('something changed?', updatedStatus.value !== status.value);
}

main();