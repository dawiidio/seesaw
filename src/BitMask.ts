import {Bufferable} from "~/utils";

export type BitValue = 1 | 0;

export class BitMask extends Bufferable {
    constructor(public value = 0) {
        super();
    }

    setNumberValue(val: number) {
        this.value = val;
        return this;
    }

    set(key: number, value: BitValue) {
        const mask = 1 << key;
        this.value = value === 1 ? this.value | mask : this.value & ~mask;
        return this;
    }

    read(key: number): BitValue {
        return ((this.value >> key) & 1) as BitValue;
    }

    toBinString() {
        return this.value.toString(2);
    }
}