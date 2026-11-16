const { EventEmitter } = require('node:events');
const HID = require('node-hid');
const REPORT_ID = 0x40, REPORT_SIZE = 64, PAYLOAD_SIZE = 62;

class HidPort extends EventEmitter {
  static async list() {
    const devices = await HID.devicesAsync();
    return devices.filter(d => [0x2341, 0x2a03].includes(d.vendorId) && d.productId === 0x8036 &&
      d.usagePage === 0xff00 && d.usage === 1).map(d => ({
      path: d.path, vendorId: d.vendorId.toString(16), productId: d.productId.toString(16),
      serialNumber: d.serialNumber || '', pnpId: d.path, transport: 'hid',
    }));
  }
  constructor({ path }) {
    super(); this.path = path; this.isOpen = false; this.polling = false; this.closing = false;
  }
  async open(callback) {
    try {
      this.device = await HID.HIDAsync.open(this.path);
      if (this.closing) { await this.device.close(); callback?.(new Error('Abertura HID cancelada.')); return; }
      this.isOpen = true; this.emit('open'); callback?.(); this.poll();
    } catch (error) { callback?.(error); }
  }
  set(_options, callback) { callback?.(); } // Sem DTR/baud na comunicacao HID.
  write(text, callback) {
    const bytes = Buffer.from(text, 'utf8');
    if (!this.isOpen || bytes.length > PAYLOAD_SIZE) {
      callback?.(new Error(!this.isOpen ? 'HID desconectado.' : 'Comando HID excedeu 62 bytes.')); return;
    }
    const packet = Buffer.alloc(REPORT_SIZE); packet[0] = REPORT_ID; packet[1] = bytes.length;
    bytes.copy(packet, 2);
    this.device.sendFeatureReport([...packet]).then(() => callback?.(), error => callback?.(error));
  }
  async poll() {
    if (!this.isOpen || this.polling) return;
    this.polling = true;
    try {
      const packet = Buffer.from(await this.device.getFeatureReport(REPORT_ID, REPORT_SIZE));
      if (!this.isOpen) return;
      if (packet.length !== REPORT_SIZE || packet[0] !== REPORT_ID || packet[1] > PAYLOAD_SIZE)
        throw new Error('Resposta HID inválida do Arduino.');
      if (packet[1]) this.emit('data', packet.subarray(2, 2 + packet[1]));
    } catch (error) {
      if (this.isOpen) this.emit('error', error);
    } finally {
      this.polling = false;
      if (this.isOpen) this.timer = setTimeout(() => this.poll(), 4);
    }
  }
  async close(callback) {
    if (this.closing) return;
    this.closing = true; this.isOpen = false; clearTimeout(this.timer);
    try {
      if (this.device) {
        const packet = Buffer.alloc(REPORT_SIZE); packet[0] = REPORT_ID; packet[1] = 7;
        packet.write('DISARM\n', 2);
        // Firmware 0.2.0+ (ffbAuto): fechar o aplicativo nao desliga o FFB do jogo.
        // Firmwares antigos continuam recebendo DISARM ao fechar (best effort).
        if (this.authenticated && !this.ffbAuto) { try { await this.device.sendFeatureReport([...packet]); } catch {} }
        await this.device.close();
      }
      this.emit('close'); callback?.();
    } catch (error) { callback?.(error); }
  }
}
module.exports = { HidPort, REPORT_ID, REPORT_SIZE, PAYLOAD_SIZE };
