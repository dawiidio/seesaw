import i2c, {PromisifiedBus} from 'i2c-bus';
import {Buffer} from 'node:buffer';
import * as console from "console";
import {createOptionsMask} from "~/masks";
import {seesawChipFactory} from "~/models";
import {SeesawChipModel} from "~/SeesawChipModel";
import {SeesawRegisters, SeesawSubRegisters} from "~/config";
import {Bufferable, createBuffer, datecodeDecode, wait} from "~/utils";
import {BitMask} from "~/BitMask";

export interface SeesawSettings {
    address: number
    bus: PromisifiedBus,
    model?: SeesawChipModel
}

export enum SeesawPinMode {
    OUTPUT,
    INPUT,
    INPUT_PULLUP,
    INPUT_PULLDOWN,
}

export interface SeesawHardwareInfo {
    buildDate: [number, number, number]
    serial: number
    chipId: number
}

class Seesaw {
    hardware: SeesawHardwareInfo;
    model: SeesawChipModel;
    options: ReturnType<typeof createOptionsMask> = createOptionsMask();

    constructor(public settings: SeesawSettings) {
        if (this.settings.model) {
            this.model = this.settings.model;
            this.hardware = {
                chipId: this.settings.model.settings.chipId.at(0),
                serial: 0,
                buildDate: [0, 0, 0]
            }
        }
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
            chipId: data.readInt8()
        }
    }

    async fetchBuildMeta() {
        const data = await this.read(SeesawRegisters.STATUS, SeesawSubRegisters.STATUS_VERSION, 4);

        const serial = data.readInt16BE(0);
        const buildDate = datecodeDecode(data.readInt16BE(2));

        return {
            serial,
            buildDate
        }
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

    async writeGpioStatus(data: Bufferable) {
        await this.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_BULK, data);
    }

    async digitalWrite(pin: number, value: boolean) {
        await this.write(
            SeesawRegisters.GPIO,
            value ? SeesawSubRegisters.GPIO_BULK_SET : SeesawSubRegisters.GPIO_BULK_CLR,
            new BitMask().set(pin, 1)
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
}

async function main() {
    const address = 0x49;

    const i2cBus = await i2c.openPromisified(1);

    const device = new Seesaw({
        bus: i2cBus,
        address,
    });

    await device.detectHardware();
    await device.reset();

    const pin = 15;
    console.log('pin', pin);
    await device.pinMode(pin, SeesawPinMode.OUTPUT);

    const execute = async () => {
        await device.toggle(pin);
        await wait(10);

        setTimeout(execute, 1000);
    }

    await execute();

    // console.log('--->', await device.fetchGpioStatus());
    // (await device.options())

    // console.log(await device.fetchChipId());
    // console.log(await device.fetchBuildMeta());
    // console.log(await device.options());
    // console.log(status);

    // await device.pinMode('PB5', SeesawPinMode.OUTPUT);

    // const status = await device.gpioStatus();
    // console.log('status >', status);
    // status.set('PB5', 1);

    // await device.gpioWrite(status);

    // await device.write(SeesawRegisters.GPIO, SeesawSubRegisters.GPIO_BULK_SET, Buffer.from([8]));
    //
    // await wait(10);
    // const updatedStatus = await device.gpioStatus();

    // todo mapping pol na nazwy moze byc zbedny, poslugujemy sie numerkami
    // todo zmienic stan jakiegos pinu, nie wiem czy dobrze je odczytuje zapisuje, nie wiem kiedy to jest le a kiedy be

    // console.log('updated status >', updatedStatus);
    //
    // console.log('something changed?', updatedStatus.value !== status.value);
}

main();