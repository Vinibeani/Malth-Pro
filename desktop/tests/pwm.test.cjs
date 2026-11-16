const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { encodeProfile } = require('../device-protocol.cjs');
const { DeviceLink } = require('../device-link.cjs');
function profile() {
  const source = fs.readFileSync(path.join(__dirname, '../../malth-control/app.js'), 'utf8');
  const context = {};
  vm.runInNewContext(source.slice(0, source.indexOf('  const effectOptions')) + 'globalThis.p = {settings: defaults, pedalCalibration: calibrationDefaults()};})();', context);
  return JSON.parse(JSON.stringify(context.p));
}
test('BTS fixa: modo padrao preserva ID2; PWM/DIR adaptado envia ID4', () => {
  const p = profile();
  assert.equal(encodeProfile(p)[4], 2);
  p.settings.driveModeCfg = '1PWM + 1DIR';
  assert.equal(encodeProfile(p)[4], 4);
  for (const frequency of ['4KHz', '16KHz', '20KHz']) {
    p.settings.pwmFreqCfg = frequency;
    assert.equal(encodeProfile(p)[3], parseInt(frequency) * 1000);
  }
});
test('modos com outra ligacao e modelos desconhecidos sao rejeitados', () => {
  for (const mode of ['1PWM + 2DIR', '2PWM + 2DIR', 'invalid']) {
    const p = profile(); p.settings.driveModeCfg = mode;
    assert.throws(() => encodeProfile(p), /outra ligação/);
  }
  const p = profile(); p.settings.hbridgeCfg = 'outro';
  assert.throws(() => encodeProfile(p), /BTS7960/);
});
test('firmware antigo nao recebe comandos do novo modo', () => {
  const port = new EventEmitter(); port.isOpen = true;
  port.write = () => { throw new Error('Nao deve acessar a porta'); };
  const link = new DeviceLink(port), p = profile();
  p.settings.driveModeCfg = '1PWM + 1DIR';
  assert.throws(() => link.sendProfile(p), /0.1.2.hex/);
});
test('firmware com capacidade confirmada recebe o novo modo por transacao', async () => {
  const port = new EventEmitter(); port.isOpen = true;
  const link = new DeviceLink(port), p = profile(), frames = [];
  link.btsPwmDir = true; p.settings.driveModeCfg = '1PWM + 1DIR';
  link.exchange = async (frame) => { frames.push(frame); return { type: 'ack', cmd: frame.split(' ')[0] }; };
  await link.sendProfile(p);
  assert.equal(frames[0], 'BEGIN'); assert.equal(frames.at(-1), 'COMMIT');
  assert.equal(Number(frames[1].split(' ')[6]), 4);
});
