
export interface SeesawModelSettings {
    chipId: number[]
    touchPins: number[]
    adcPins: number[]
    dacPins: number[]
    pwmPins: number[]
    pwmWidth: number
}

export class SeesawChipModel {
    constructor(public settings: SeesawModelSettings) {

    }
}