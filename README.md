# Seesaw

[Adafruit Seesaw](https://learn.adafruit.com/adafruit-seesaw-atsamd09-breakout?view=all) boards driver for Node.js

Still under heavy development, support for the rest of functionalities will be added soon.

## Installation

```shell
npm i -S @dawiidio/seesaw
// or
yarn add @dawiidio/seesaw
```

## Usage

```ts
import i2c from 'i2c-bus';
import { Seesaw, SeesawPinMode } from '@dawiidio/seesaw';

async function main() {
    const address = 0x49 as const;
    const bus = await i2c.openPromisified(1);

    const device = new Seesaw({
        bus,
        address,
    });
    
    await device.detectHardware();
    // software reset, could be skipped
    await device.reset();

    const ledPin = 15;
    const adcPin = 2;
    await device.pinMode(pin, SeesawPinMode.OUTPUT);
    await device.pinMode(adcPin, SeesawPinMode.INPUT);

    setInterval(async () => {
        console.log('ADC >', await device.analogReadVoltage(adcPin));
        await device.toggle(ledPin);
    }, 1000);
}

main();
```

## Supported functionalities

-[x] GPIO
-[x] ADC
-[ ] UART
-[ ] Interrupts
-[ ] PWM
-[ ] Eeprom
-[ ] Eeprom
-[ ] Neopixel
-[ ] Touch buttons

## Supported microcontrollers

-[x] Attiny8xx
-[x] Attiny16xx
-[x] SAMD09