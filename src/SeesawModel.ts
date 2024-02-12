import {EnumBitMask} from "~/EnumBitMask";

export interface SeesawModelSettings<T> {
    touchPins: T[]
    adcPins: T[]
    dacPins: T[]
    pwmPins: T[]
    pwmWidth: number
}

export class SeesawModel<F extends () => EnumBitMask<any>> {
    constructor(public pinMaskFactory: F, public settings: SeesawModelSettings<keyof ReturnType<F>["enumValue"]>) {

    }
}