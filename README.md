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
    await device.pinMode(ledPin, SeesawPinMode.OUTPUT);
    await device.pinMode(adcPin, SeesawPinMode.INPUT);

    setInterval(async () => {
        console.log('ADC >', await device.analogReadVoltage(adcPin));
        await device.toggle(ledPin);
    }, 1000);
}

main();
```

## Supported functionalities

- [x] Device
- [x] Pin config
- [x] GPIO
- [x] ADC
- [ ] PWM
- [ ] UART
- [ ] Interrupts
- [ ] Eeprom
- [ ] Neopixel
- [ ] Touch buttons _(may work with basic GPIO config)_

### Device

#### Reset

device software reset

```ts
await device.reset();
```

### Pin config

```ts
import { Seesaw, SeesawPinMode } from '@dawiidio/seesaw';

//...

device.pinMode(15, SeesawPinMode.OUTPUT);
// or
device.pinMode(15, SeesawPinMode.INPUT);
// or
device.pinMode(15, SeesawPinMode.INPUT_PULLDOWN);
// or
device.pinMode(15, SeesawPinMode.INPUT_PULLUP);
```

### GPIO

#### Write

```ts
const pinValue = true;
await device.digitalWrite(15, pinValue);
```

#### Read

```ts
const pinValue: boolean = await device.digitalRead(15);
```

#### Toggle

```ts
await device.toggle(15);
```

### ADC

## Read

Read raw ADC value

```ts
const adcValue: number = await device.analogRead(2); // int 0-1023
```

Read voltage

```ts
const device = new Seesaw({
    bus,
    address,
    adcRefVoltage: 3.3 // by default 3.3, if your Seesaw board runs on 5v set 5 here
});

// ...

// below value will be based on voltage set in the constructor settings  
const adcValue: number = await device.analogReadVoltage(2); // float
```

## Supported microcontrollers

- [x] Attiny8xx
- [x] Attiny16xx
- [x] SAMD09