import {Buffer} from "node:buffer";

export function datecodeDecode(code: number): [number, number, number] {
    let day = code & 0x1F;
    let month = (code >> 5) & 0x0F;
    let year = ((code >> 9) & 0x7F);
    return [year, month, day];
}

export function datecodeEncode(year: number, month: number, day: number) {
    let yearCode = (year % 100) & 0x7F;
    let monthCode = month & 0x0F;
    let dayCode = day & 0x1F;
    return (yearCode << 9) | (monthCode << 5) | dayCode;
}

export function createBuffer(bytesOrLength?: number[] | number): Buffer {
    if (typeof bytesOrLength === 'undefined') {
        return Buffer.alloc(0);
    } else if (Array.isArray(bytesOrLength)) {
        const b = Buffer.alloc(bytesOrLength.length*4);
        bytesOrLength.forEach((val) => b.writeInt32BE(val));
        return b;
    } else if (typeof bytesOrLength === 'number') {
        return Buffer.alloc(bytesOrLength);
    }

    throw new Error(`Wrong param type. Param: ${bytesOrLength}`);
}

export const wait = (delay: number = 5) => new Promise((resolve) => setTimeout(resolve, delay));

export type Byte = number;

export abstract class Bufferable {
    abstract value: number;
    // by default 4 bytes = 32 bit uint
    protected size: Byte = 4;

    toBuffer(): Buffer {
        const buff = Buffer.alloc(this.size);
        buff.writeInt32BE(this.value);
        return buff;
    }

    static isBufferable(predicate: any): predicate is Bufferable {
        return predicate instanceof Bufferable;
    }
}