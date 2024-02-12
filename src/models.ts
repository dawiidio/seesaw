import {EnumBitMask} from "~/EnumBitMask";
import {SeesawModel} from "~/SeesawModel";

export const createSAMD09PinMask = EnumBitMask.createFactory([
    'PA0',  'PA1',  'PA2',  'PA3',
    'PA4',  'PA5',  'PA6',  'PA7',
    'PA8',  'PA9',  'PA10', 'PA11',
    'PA12', 'PA13', 'PA14', 'PA15',
    'PA16', 'PA17', 'PA18', 'PA19',
    'PA20', 'PA21', 'PA22', 'PA23',
    'PA24', 'PA25', 'PA26', 'PA27',
    'PA28', 'PA29', 'PA30', 'PA31'
] as const);

export const createAttinyPinMask = EnumBitMask.createFactory([
    'PA4', 'PA5', 'PA6', 'PA7',
    'PB7', 'PB6', 'PB5', 'PB4',
    'PB3', 'PB2', 'PB1', 'PB0',
    'PC0', 'PC1', 'PC2', 'PC3',
    'PC4', 'PC5', 'PA1', 'PA2',
    'PA3'
] as const);

export const attinyModel = new SeesawModel(createAttinyPinMask, {
    touchPins: [],
    adcPins: ['PA3'],
    dacPins: [],
    pwmPins: [],
    pwmWidth: 1
});
export const samd09Model = new SeesawModel(createSAMD09PinMask, {
    touchPins: [],
    adcPins: ['PA3'],
    dacPins: [],
    pwmPins: [],
    pwmWidth: 1
});