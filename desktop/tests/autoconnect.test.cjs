const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { automaticCandidates } = require('../connection-selection.cjs');
const leonardo = (port = 'COM4') => ({ path: port, vendorId: '2341', productId: '8036', serialNumber: 'test-board' });

function harness(ports = [leonardo()], ownsInstance = true) {
  const opened = [], events = [], handlers = new Map(), storage = new Map(), logs = [];
  let quitting = false;
  class FakeSerial extends EventEmitter {
    static ports = ports;
    static async list() { return this.ports; }
    constructor(options) { super(); this.path = options.path; this.frames = []; this.isOpen = false; opened.push(this); }
    open(cb) { this.isOpen = true; setImmediate(() => cb()); }
    set(_options, cb) { cb(); }
    write(text, cb) {
      const cmd = text.trim().split(' ')[0]; this.frames.push(text.trim());
      const msg = cmd === 'HELLO' ? { type: 'hello', device: this.path === 'COM9' ? 'OtherFirmware' : 'MalthPro', protocol: 2, registers: 65, firmware: '0.1.2' } : { type: 'ack', cmd };
      setImmediate(() => { cb?.(); this.emit('data', Buffer.from(JSON.stringify(msg) + '\n')); });
    }
    close(cb) { this.isOpen = false; this.emit('close'); cb?.(); }
  }
  const electron = {
    app: { getPath: () => 'test-profile', requestSingleInstanceLock: () => ownsInstance,
      quit() { quitting = true; }, whenReady: () => ({ then() {} }), on() {} },
    ipcMain: { on() {}, handle(name, fn) { handlers.set(name, fn); } },
  };
  const context = {
    require(name) {
      if (name === 'electron') return electron;
      if (name === 'serialport') return { SerialPort: FakeSerial };
      if (name === './hid-port.cjs') return { HidPort: FakeSerial };
      if (name === './connection-log.cjs') return { createConnectionLog: () => (event, detail) => logs.push({ event, detail }) };
      if (name === 'node:fs') return { mkdirSync() {}, readFileSync(p) { if (!storage.has(p)) throw Error('absent'); return storage.get(p); }, writeFileSync(p, data) { storage.set(p, data); } };
      return name.startsWith('./') ? require(path.join(__dirname, '..', name)) : require(name);
    },
    __dirname: path.join(__dirname, '..'), process, setInterval, clearInterval, Date,
    emit(channel, value) { events.push({ channel, value }); },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../main.cjs'), 'utf8') + `
    mainWindow = {isDestroyed:()=>false,webContents:{send:emit}};
    globalThis.api = {connect:selectAndConnectDevice,send:sendProfileToDevice,close:()=>deviceLink?.close()};`, context);
  return { ...context.api, opened, events, handlers, FakeSerial, logs, quitting };
}

test('descobre Leonardo na primeira execução, ignora COM desconhecida e bootloader', () => {
  const board = leonardo();
  assert.deepEqual(automaticCandidates([{ path: 'COM1' }, { ...board, path: 'COM2', productId: '0036' }, board]), [board]);
  assert.deepEqual(automaticCandidates([leonardo('COM8')], leonardo()), [leonardo('COM8')]);
});

test('perda da sessão sem sumir COM invalida conexão e refaz HELLO/perfil/CENTER/ARM', async () => {
  const h = harness();
  try {
    await h.connect();
    const port = h.opened[0];
    port.emit('data', Buffer.from('{"type":"error","code":"HELLO_REQUIRED"}\n'));
    assert.equal(port.isOpen, false);
    assert.equal(h.events.at(-1).value.state, 'disconnected');
    assert.equal(h.logs.at(-1).detail.code, 'HELLO_REQUIRED');
    assert.equal((await h.connect()).path, 'COM4');
    assert.deepEqual(h.opened[1].frames, ['HELLO 2']);
    await h.send({ settings: { minforceCfg: 0, maxForceCfg: 100 } });
    assert.deepEqual(h.opened[1].frames.slice(-3), ['COMMIT', 'CENTER', 'ARM']);
    assert.match(h.events.filter(e => e.channel === 'device:state').at(-1).value.lastFailure, /sessão/);
  } finally { h.close(); }
});

test('erro de USB durante comunicação preserva causa e reconecta na mesma COM', async () => {
  const h = harness();
  try {
    await h.connect();
    h.opened[0].emit('error', Object.assign(Error('Access denied (ReadFile)'), { code: 'UNKNOWN' }));
    assert.match(h.events.at(-1).value.detail, /interrompida/);
    assert.doesNotMatch(h.events.at(-1).value.detail, /Feche outros/);
    assert.equal(h.logs.at(-1).detail.original, 'Access denied (ReadFile)');
    assert.equal((await h.connect()).connected, true);
    assert.equal(h.opened.length, 2);
  } finally { h.close(); }
});

test('segunda instância encerra sem inicializar outra sessão', () => {
  const h = harness([], false);
  assert.equal(h.quitting, true);
  assert.equal(h.opened.length, 0);
});

test('primeiro uso e reconexão: protocolo antes de perfil, CENTER e ARM, sem diálogo', async () => {
  const h = harness();
  try {
    assert.equal((await h.connect()).connected, true);
    assert.deepEqual(h.opened[0].frames, ['HELLO 2']);
    const profile = { settings: { minforceCfg: 0, maxForceCfg: 25 } };
    assert.equal((await h.send(profile)).forceEnabled, true);
    assert.deepEqual(h.opened[0].frames.slice(-3), ['COMMIT', 'CENTER', 'ARM']);
    h.opened[0].close();
    h.FakeSerial.ports = [leonardo('COM8')];
    assert.equal((await h.connect()).path, 'COM8');
    await h.send(profile);
    assert.deepEqual(h.opened[1].frames.slice(-3), ['COMMIT', 'CENTER', 'ARM']);
    assert.equal(h.handlers.has('device:disconnect'), false);
  } finally { h.close(); }
});

test('firmware alheio nunca recebe perfil ou ARM; próxima candidata é identificada', async () => {
  const h = harness([leonardo('COM9'), leonardo()]);
  try {
    assert.equal((await h.connect()).path, 'COM4');
    assert.deepEqual(h.opened[0].frames, ['HELLO 2']);
    assert.equal(h.opened[0].isOpen, false);
  } finally { h.close(); }
});

test('detecções concorrentes não abrem a porta duas vezes; erro de enumeração é tratado', async () => {
  const h = harness();
  try {
    await Promise.all([h.connect(), h.connect()]);
    assert.equal(h.opened.length, 1);
    h.close();
    h.FakeSerial.list = async () => { throw Error('enumeration failed'); };
    assert.equal((await h.connect()).connected, false);
  } finally { h.close(); }
});
