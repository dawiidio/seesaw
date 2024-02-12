import { PromisifiedBus } from 'i2c-bus';
import { SeesawChipModel } from '~/SeesawChipModel';
import { createOptionsMask } from '~/masks';
import { SeesawRegisters, SeesawSubRegisters } from '~/config';
import { Buffer } from 'node:buffer';
import { Bufferable, createBuffer, datecodeDecode, wait } from '~/utils';
import { samd09Model, seesawChipFactory } from '~/models';
import { BitMask } from '~/BitMask';

export interface SeesawSettings {
    address: number
    bus: PromisifiedBus,
    model?: SeesawChipModel
    adcRefVoltage?: number
}

export enum SeesawPinMode {
    OUTPUT,
    INPUT,
    INPUT_PULLUP,
    INPUT_PULLDOWN,
}

export interface SeesawHardwareInfo {
    buildDate: [number, number, number];
    serial: number;
    chipId: number;
}

const ADC_OFFSET = 0x07;
const ADC_RESOLUTION = 1023;

export class Seesaw {
    hardware: SeesawHardwareInfo;
    model: SeesawChipModel;
    options: ReturnType<typeof createOptionsMask> = createOptionsMask();
    adcRefVoltage = 3.3;

    constructor(public settings: SeesawSettings) {
        if (this.settings.model) {
            this.model = this.settings.model;
            this.hardware = {
                chipId: this.settings.model.settings.chipId.at(0),
                serial: 0,
                buildDate: [0, 0, 0],
            };
        }

        if (this.settings.adcRefVoltage)
            this.adcRefVoltage = this.settings.adcRefVoltage;
    }

    async read(register: SeesawRegisters, subRegister: SeesawSubRegisters, readBufferOrSize: Buffer | number) {
        const readBuffer = typeof readBufferOrSize === 'number' ? createBuffer(readBufferOrSize) : readBufferOrSize;

        await this.write(register, subRegister);
        await wait();

        await this.settings.bus.i2cRead(this.settings.address, readBuffer.length, readBuffer);
        return readBuffer;
    }

    async write(register: SeesawRegisters, subRegister: SeesawSubRegisters, data: Buffer | Bufferable = createBuffer()) {
        const dataBuffer = Bufferable.isBufferable(data) ? data.toBuffer() : data;

        const i2cHeader = Buffer.from([register, subRegister]);
        const i2cFrame = Buffer.concat([i2cHeader, dataBuffer], i2cHeader.length + dataBuffer.length);

        await this.settings.bus.i2cWrite(this.settings.address, i2cFrame.length, i2cFrame);
    }

    async detectHardware() {
        this.hardware = {
            ...(await this.fetchBuildMeta()),
            ...(await this.fetchChipId()),
        };
        this.options = await this.fetchOptions();

        this.model = seesawChipFactory(this.hardware.chipId);
    }

    private ensureHardwareConfig() {
        if (!this.hardware || !this.model) {
            throw new Error(`You must call detectHardware() method first, or pass model in constructor`);
        }
    }

    async fetchChipId() {
        const data = await this.read(SeesawRegisters.STATUS, SeesawSubRegisters.HW_ID_CODE, 1);

        return {
            chipId: data.readInt8(),
        };
    }

    async fetchBuildMeta() {
        const data = await this.read(SeesawRegisters.STATUS, SeesawSubRegisters.STATUS_VERSION, 4);

        const serial = data.readInt16BE(0);
        const buildDate = datecodeDecode(data.readInt16BE(2));

        return {
            serial,
            buildDate,
        };
    }

    async fetchOptions() {
        const data = await this.read(SeesawRegisters.STATUS, SeesawSubRegisters.STATUS_OPTIONS, 4);
        const enumBitMask = createOptionsMask();
        enumBitMask.setNumberValue(data.readInt32BE());

        return enumBitMask;
    }

    async fetchGpioStatus() {
        const data = await this.read(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_BULK, 4);
        return new BitMask(data.readInt32BE());
    }

    async digitalWrite(pin: number, value: boolean) {
        await this.write(
            SeesawRegisters.GPIO,
            value ? SeesawSubRegisters.GPIO_BULK_SET : SeesawSubRegisters.GPIO_BULK_CLR,
            new BitMask().set(pin, 1),
        );
        await wait(10);
    }

    async toggle(pin: number) {
        const status = await this.fetchGpioStatus();

        await this.digitalWrite(pin, !status.read(pin));
    }

    async reset() {
        await this.write(SeesawRegisters.STATUS, SeesawSubRegisters.STATUS_SWRST, createBuffer([0xff]));
        await wait(100);
    }

    async pinMode(pin: number, mode: SeesawPinMode) {
        const pinsBitMask = new BitMask();
        pinsBitMask.set(pin, 1);

        switch (mode) {
            case SeesawPinMode.OUTPUT:
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_DIRSET_BULK, pinsBitMask);
                break;
            case SeesawPinMode.INPUT:
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_DIRCLR_BULK, pinsBitMask);
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_PULLENCLR, pinsBitMask);
                break;
            case SeesawPinMode.INPUT_PULLUP:
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_DIRCLR_BULK, pinsBitMask);
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_PULLENSET, pinsBitMask);
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_BULK_SET, pinsBitMask);
                break;
            case SeesawPinMode.INPUT_PULLDOWN:
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_DIRCLR_BULK, pinsBitMask);
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_PULLENSET, pinsBitMask);
                await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_BULK_CLR, pinsBitMask);
                break;
        }
    }

    async analogRead(pin: number): Promise<number> {
        if (!this.model.settings.adcPins.includes(pin)) {
            throw new Error(`Wrong ADC pin ${pin}`);
        }

        const pinOffset = samd09Model.is(this.hardware.chipId) ? this.model.settings.adcPins.indexOf(pin) : pin;

        const buff = await this.read(SeesawRegisters.ADC, ADC_OFFSET + pinOffset, 2);
        return buff.readInt16BE();
    }

    async analogReadVoltage(pin: number): Promise<number> {
        const adcValue = await this.analogRead(pin);

        return (adcValue/ADC_RESOLUTION)*this.adcRefVoltage;
    }
}