import {EnumBitMask} from "~/EnumBitMask";
import {SeesawChipModel} from "~/SeesawChipModel";

// export const createSAMD09PinMask = EnumBitMask.createFactory([
//     'PA0',  'PA1',  'PA2',  'PA3',
//     'PA4',  'PA5',  'PA6',  'PA7',
//     'PA8',  'PA9',  'PA10', 'PA11',
//     'PA12', 'PA13', 'PA14', 'PA15',
//     'PA16', 'PA17', 'PA18', 'PA19',
//     'PA20', 'PA21', 'PA22', 'PA23',
//     'PA24', 'PA25', 'PA26', 'PA27',
//     'PA28', 'PA29', 'PA30', 'PA31'
// ] as const);
//
// export const createAttinyPinMask = EnumBitMask.createFactory([
//     'PA4', 'PA5', 'PA6', 'PA7',
//     'PB7', 'PB6', 'PB5', 'PB4',
//     'PB3', 'PB2', 'PB1', 'PB0',
//     'PC0', 'PC1', 'PC2', 'PC3',
//     'PC4', 'PC5', 'PA1', 'PA2',
//     'PA3'
// ] as const);

export const attiny8xxModel = new SeesawChipModel({
    touchPins: [],
    adcPins: [0, 1, 2, 3, 6, 7, 18, 19, 20],
    dacPins: [],
    // 6, 7, 8 - 16 bit , rest 8 bit
    pwmPins: [0, 1, 9, 12, 13, 6, 7, 8],
    pwmWidth: 16,
    chipId: [0x84, 0x85, 0x86, 0x87]
});

export const attiny16xxModel = new SeesawChipModel({
    touchPins: [],
    adcPins: [0, 1, 2, 3, 4, 5, 14, 15, 16],
    dacPins: [],
    // 4, 5, 6 - 16 bit , rest 8 bit
    pwmPins: [0, 1, 7, 11, 16, 4, 5, 6],
    pwmWidth: 16,
    chipId: [0x88, 0x89]
});

export const samd09Model = new SeesawChipModel({
    touchPins: [],
    adcPins: [2,3,4,5],
    dacPins: [],
    pwmPins: [4,5,6,7],
    pwmWidth: 8,
    chipId: [0x55]
});

export const SUPPORTED_CHIPS = [
    attiny8xxModel,
    attiny16xxModel,
    samd09Model,
];

export const seesawChipFactory = (chipId: number) => {
    const predicate =  SUPPORTED_CHIPS.find(chip => {
        return chip.settings.chipId.includes(chipId);
    });

    if (!predicate)
        throw new Error(`Unknown chip id ${chipId}`);

    return predicate;
}