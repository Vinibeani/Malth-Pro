const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { DeviceLink } = require('../device-link.cjs');
const { encodeProfile, profileFrames, REGISTER_COUNT } = require('../device-protocol.cjs');

function interfaceProfile() {
  const source = fs.readFileSync(path.join(__dirname, '../../malth-control/app.js'), 'utf8');
  const context = {};
  vm.runInNewContext(source.slice(0, source.indexOf('  const effectOptions')) + 'globalThis.values = {settings: defaults, pedalCalibration: calibrationDefaults()};})();', context);
  return JSON.parse(JSON.stringify(context.values));
}
class SerialDouble extends EventEmitter {
  constructor() { super(); this.isOpen = true; this.frames = []; this.registers = []; this.committed = null; }
  write(text, callback) {
    const frame = text.trim(); this.frames.push(frame);
    const [cmd, ...args] = frame.split(' ');
    if (cmd === 'BEGIN') this.registers = [];
    if (cmd === 'SET') { assert.equal(Number(args.shift()), this.registers.length); this.registers.push(...args.map(Number)); }
    if (cmd === 'COMMIT') this.committed = [...this.registers];
    const message = cmd === 'HELLO' ? { type: 'hello', device: 'MalthPro', protocol: 2, registers: 65, firmware: '0.1.0' } : { type: 'ack', cmd };
    const data = `${JSON.stringify(message)}\n`;
    setImmediate(() => { callback?.(); this.emit('data', Buffer.from(data.slice(0, 7))); this.emit('data', Buffer.from(data.slice(7))); });
  }
  close(callback) { this.isOpen = false; this.emit('close'); callback?.(); }
}
test('o perfil real da interface vira 65 registradores e cabe nas linhas do AVR', () => {
  const profile = interfaceProfile();
  assert.equal(encodeProfile(profile).length, REGISTER_COUNT);
  assert(profileFrames(profile).every((line) => Buffer.byteLength(line) < 79));
  profile.pedalCalibration.accel = { min: 25.25, max: 78.75 };
  assert.deepEqual(encodeProfile(profile).slice(7, 9), [258, 806]);
});
test('limites invalidos e modos fora da pinagem sao rejeitados antes de enviar', () => {
  for (const setting of [{ steeringAngleCfg: 29 }, { steeringAngleCfg: 2161 }, { pwmFreqCfg: '32KHz' },
    { driveModeCfg: '2PWM + 2DIR' }, { useIndexCfg: true }, { yLowCfg: 900 }, { minforceCfg: 99, maxForceCfg: 10 },
    { brakeLin50Cfg: 0 }]) {
    const profile = interfaceProfile(); Object.assign(profile.settings, setting);
    assert.throws(() => encodeProfile(profile));
  }
  const profile = interfaceProfile();
  profile.settings.steeringAngleCfg = 30; profile.settings.pwmFreqCfg = '4KHz'; assert.equal(encodeProfile(profile)[3], 4000);
  profile.settings.steeringAngleCfg = 2160; profile.settings.pwmFreqCfg = '20KHz'; assert.equal(encodeProfile(profile)[1], 2160);
});
test('handshake, ACKs fragmentados, perfil atomico e gravacao confirmada', async () => {
  const serial = new SerialDouble(), link = new DeviceLink(serial);
  try {
    await link.handshake();
    assert.equal(link.connected, true);
    const profile = interfaceProfile();
    const result = await link.sendProfile(profile, true);
    assert.deepEqual(serial.committed, encodeProfile(profile));
    assert.deepEqual(serial.frames.slice(-2), ['COMMIT', 'SAVE']);
    assert.equal(result.persisted, true);
  } finally { link.close(); }
});
test('comandos concorrentes sao enviados em ordem, sem misturar ACKs', async () => {
  const serial = new SerialDouble(), link = new DeviceLink(serial);
  try {
    await link.handshake();
    await Promise.all([link.sendProfile(interfaceProfile()), link.command('CENTER'), link.command('ARM')]);
    assert.deepEqual(serial.frames.slice(-3), ['COMMIT', 'CENTER', 'ARM']);
  } finally { link.close(); }
});
test('porta sem resposta expira e desconecta em vez de congelar a operacao', async () => {
  const serial = new SerialDouble(); serial.write = (_data, cb) => cb?.();
  const link = new DeviceLink(serial);
  await assert.rejects(link.exchange('PING', () => false, 20), /não confirmou/);
  assert.equal(link.closed, true); assert.equal(serial.isOpen, false);
});
test('perda de USB cancela o comando que aguarda confirmacao', async () => {
  const serial = new SerialDouble(); serial.write = (_data, cb) => cb?.();
  const link = new DeviceLink(serial);
  const pending = link.command('CENTER');
  setImmediate(() => serial.close());
  await assert.rejects(pending, /desconectado/);
});
