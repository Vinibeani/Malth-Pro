const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { CPU, avrInstruction } = require('../tooling/emulator/package/dist/cjs/index.js');
const root = path.resolve(__dirname, '..');
// Windows: toolchain local do Arduino CLI. Linux/macOS: avr-gcc 7.3 do sistema e o core de referencia.
const localTools = path.join(root, 'tooling/data/packages/arduino/tools/avr-gcc/7.3.0-atmel3.6.1-arduino7/bin');
const exe = process.platform === 'win32' ? '.exe' : '';
const tool = (name) => fs.existsSync(path.join(localTools, name + exe)) ? path.join(localTools, name + exe) : name;
const localCore = path.join(root, 'tooling/data/packages/arduino/hardware/avr/1.8.8');
const core = fs.existsSync(localCore) ? localCore : path.join(root, 'reference/ArduinoAVR-1.8.8');
const pwmOnly = process.argv.includes('--pwm');
const effectsOnly = process.argv.includes('--effects');
const commutationOnly = process.argv.includes('--commutation');
const sessionOnly = process.argv.includes('--session');
const output = path.join(root, sessionOnly ? 'build/controller-session-test' : commutationOnly ? 'build/motor-runtime-test' : effectsOnly ? 'build/effect-test' : pwmOnly ? 'build/pwm-test' : 'build/math-test'); fs.mkdirSync(output, { recursive: true });
if(commutationOnly){
 const source=fs.readFileSync(path.join(root,'Leonardo/MalthProLeonardo/Controller.cpp'),'utf8');
 const functions=['motorOff','motorAllowed','writeMotor','serviceMotorEnable','motorPwmOverflow'].map(name=>{
  let start=source.indexOf('static void '+name+'(');if(start<0)start=source.indexOf('static bool '+name+'(');if(start<0){if(name==='serviceMotorEnable'||name==='motorPwmOverflow')return 'static void '+name+'(){}';throw Error(name);}
  let end=source.indexOf('{',start),depth=1;while(depth){++end;if(source[end]==='{')++depth;if(source[end]==='}')--depth;}
  return source.slice(start,end+1);
 });fs.writeFileSync(output+'/motor-runtime-functions.h',functions.join('\n'));
}
// Sessao: Controller.cpp real + PIDReportHandler real; so Joystick/USB/Serial sao substituidos.
const eepromDir = [path.join(core, 'libraries/EEPROM/src'), path.join(root, 'tooling/libraries/EEPROM/src')].find(fs.existsSync);
const sessionArgs = sessionOnly ? ['-I' + path.join(__dirname, 'session-fakes'), '-DARDUINO=10607', '-DARDUINO_AVR_LEONARDO', '-DARDUINO_ARCH_AVR',
  '-DUSB_VID=0x2341', '-DUSB_PID=0x8036', ...(eepromDir ? ['-I' + eepromDir] : [])] : [];
execFileSync(tool('avr-g++'), ['-mmcu=atmega32u4', '-Os', '-std=gnu++11', '-DF_CPU=16000000L', ...sessionArgs,
  '-I' + path.join(core, 'cores/arduino'), '-I' + path.join(core, 'variants/leonardo'),
  '-I' + path.join(root, 'Leonardo/MalthProLeonardo'), '-I' + path.join(root, 'libraries/JoystickFFB/src'),
  '-I'+output,
  path.join(__dirname, sessionOnly ? 'controller-session.cpp' : commutationOnly ? 'motor-runtime.cpp' : effectsOnly ? 'effects-protocol.cpp' : pwmOnly ? 'pwm-output.cpp' : 'control-math.cpp'),
  ...(pwmOnly||commutationOnly ? [] : [path.join(root, 'libraries/JoystickFFB/src/DynamicHID/PIDReportHandler.cpp')]),
  '-o', output + '/test.elf']);
execFileSync(tool('avr-objcopy'), ['-O', 'binary', output + '/test.elf', output + '/test.bin']);
const symbols = execFileSync(tool('avr-nm'), [output + '/test.elf'], { encoding: 'utf8' });
const location = parseInt(symbols.match(/^([\da-f]+)\s+\w\s+testResult$/m)[1], 16) - 0x800000;
const code = fs.readFileSync(output + '/test.bin');
const program = new Uint16Array(16384); new Uint8Array(program.buffer).set(code);
const cpu = new CPU(program, 2560);
for (let instructions = 0; instructions < (pwmOnly||commutationOnly||sessionOnly ? 400000000 : 20000000) && cpu.data[location] !== 0xa5; ++instructions) { avrInstruction(cpu); cpu.tick(); }
if (cpu.data[location] !== 0xa5) throw new Error('O teste AVR nao concluiu.');
const cases = cpu.data[location + 1], failures = cpu.data[location + 2];
console.log(`${cases} verificacoes ${pwmOnly ? 'de PWM ' : ''}executadas em instrucoes AVR; ${failures} falhas.`);
if (failures) process.exitCode = 1;
