import {EnumBitMask} from "~/EnumBitMask";

export const createStatusMask = EnumBitMask.createFactory([
    'STATUS',
    'GPIO',
    'SERCOM0',
    'SERCOM1',
    'SERCOM2',
    'SERCOM3',
    'SERCOM4',
    'SERCOM5',
    'TIMER',
    'ADC',
    'DAC',
    'INTERRUPT',
    'DAP',
    'EEPROM',
    'NEOPIXEL',
    'TOUCH',
    'KEYPAD',
    'ENCODER',
] as const);