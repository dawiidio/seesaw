import {Buffer} from "node:buffer";

export type RegisterMaskObject<T extends readonly string[]> = Record<T[number], number>;

export type BitValue = 1 | 0;

export class EnumBitMask<T extends readonly string[]> {
    enumValue: RegisterMaskObject<T>;

    constructor(public readonly keys: T, public value: number = 0) {
        this.updateEnumObject();
    }

    private updateEnumObject() {
        this.enumValue = this.keys.reduce((acc, key, i) => ({
            ...acc,
            [key]: (this.value >> i) & 1
        }), {}) as RegisterMaskObject<T>;
    }

    setNumberValue(val: number) {
        this.value = val;
        this.updateEnumObject();
    }

    set(key: keyof RegisterMaskObject<T>, value: BitValue) {
        if (!this.keys.includes(key as string)) {
            throw new Error(`Wrong key ${key as string}`);
        }

        const mask = 1 << this.keys.indexOf(key as string);
        this.value = value === 1 ? this.value | mask : this.value & ~mask;
        this.updateEnumObject();
    }

    read(key: keyof RegisterMaskObject<T>): BitValue {
        if (!this.keys.includes(key as string)) {
            throw new Error(`Wrong key ${key as string}`);
        }

        return ((this.value >> this.keys.indexOf(key as string)) & 1) as BitValue;
    }

    toBuffer() {
        return Buffer.from([this.value]);
    }

    static createFactory<T extends readonly string[]>(keys: T): () => EnumBitMask<T> {
        return () => new EnumBitMask<T>(keys);
    }
}