const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { CPU, avrInstruction } = require('../tooling/emulator/package/dist/cjs/index.js');
const root = path.resolve(__dirname, '..');
const tools = path.join(root, 'tooling/data/packages/arduino/tools/avr-gcc/7.3.0-atmel3.6.1-arduino7/bin');
const core = path.join(root, 'tooling/data/packages/arduino/hardware/avr/1.8.8');
const pwmOnly = process.argv.includes('--pwm');
const output = path.join(root, pwmOnly ? 'build/pwm-test' : 'build/math-test'); fs.mkdirSync(output, { recursive: true });
execFileSync(path.join(tools, 'avr-g++.exe'), ['-mmcu=atmega32u4', '-Os', '-std=gnu++11', '-DF_CPU=16000000L',
  '-I' + path.join(core, 'cores/arduino'), '-I' + path.join(core, 'variants/leonardo'),
  '-I' + path.join(root, 'Leonardo/MalthProLeonardo'), '-I' + path.join(root, 'libraries/JoystickFFB/src'),
  path.join(__dirname, pwmOnly ? 'pwm-output.cpp' : 'control-math.cpp'),
  ...(pwmOnly ? [] : [path.join(root, 'libraries/JoystickFFB/src/DynamicHID/PIDReportHandler.cpp')]),
  '-o', output + '/test.elf']);
execFileSync(path.join(tools, 'avr-objcopy.exe'), ['-O', 'binary', output + '/test.elf', output + '/test.bin']);
const symbols = execFileSync(path.join(tools, 'avr-nm.exe'), [output + '/test.elf'], { encoding: 'utf8' });
const location = parseInt(symbols.match(/^([\da-f]+)\s+\w\s+testResult$/m)[1], 16) - 0x800000;
const code = fs.readFileSync(output + '/test.bin');
const program = new Uint16Array(16384); new Uint8Array(program.buffer).set(code);
const cpu = new CPU(program, 2560);
for (let instructions = 0; instructions < (pwmOnly ? 200000000 : 20000000) && cpu.data[location] !== 0xa5; ++instructions) { avrInstruction(cpu); cpu.tick(); }
if (cpu.data[location] !== 0xa5) throw new Error('O teste AVR nao concluiu.');
const cases = cpu.data[location + 1], failures = cpu.data[location + 2];
console.log(`${cases} verificacoes ${pwmOnly ? 'de PWM ' : ''}executadas em instrucoes AVR; ${failures} falhas.`);
if (failures) process.exitCode = 1;
