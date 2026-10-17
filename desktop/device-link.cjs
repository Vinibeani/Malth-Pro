const { PROTOCOL, DEVICE, REGISTER_COUNT, profileFrames, protocolErrors, deviceErrorMessage } = require('./device-protocol.cjs');

class DeviceLink {
  constructor(port, onMessage = () => {}, onLost = () => {}) {
    this.port = port; this.onMessage = onMessage; this.onLost = onLost;
    this.buffer = ''; this.queue = Promise.resolve(); this.jobs = 0; this.pending = null;
    this.connected = false; this.closed = false;
    port.on('data', (chunk) => this.receive(chunk));
    port.on('error', (error) => this.fail(error));
    port.on('close', () => this.fail(new Error('Arduino desconectado.')));
  }
  receive(chunk) {
    this.buffer += chunk.toString('utf8');
    if (this.buffer.length > 4096) return this.fail(new Error('Resposta do Arduino excedeu o limite.'));
    let newline;
    while ((newline = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      const waiting = this.pending;
      if (waiting && (message.type === 'error' || waiting.matches(message))) {
        this.pending = null; clearTimeout(waiting.timer);
        if (message.type === 'error') waiting.reject(new Error(protocolErrors[message.code] || 'O Arduino não conseguiu concluir a operação.'));
        else waiting.resolve(message);
      }
      this.onMessage(message);
    }
  }
  exchange(frame, matches, timeout = 2500) {
    if (this.closed || !this.port.isOpen) return Promise.reject(new Error('Arduino desconectado.'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = null;
        const operation = { HELLO: 'a identificação', BEGIN: 'o início da configuração', SET: 'o envio dos ajustes',
          COMMIT: 'a aplicação do perfil', SAVE: 'a gravação', CENTER: 'a centralização',
          ARM: 'a ativação da força', DISARM: 'a desativação da força', PING: 'a conexão' }[frame.split(' ')[0]] || 'a operação';
        const error = new Error(`O Arduino não confirmou ${operation}.`);
        reject(error); this.fail(error);
      }, timeout);
      this.pending = { resolve, reject, matches, timer };
      this.port.write(`${frame}\n`, (error) => {
        if (error) this.fail(error);
      });
    });
  }
  enqueue(work) {
    if (this.jobs >= 8) return Promise.reject(new Error('Aguarde a operação atual do Arduino terminar.'));
    ++this.jobs;
    const result = this.queue.then(() => {
      if (this.closed) throw new Error('Arduino desconectado.');
      return work();
    });
    this.queue = result.catch(() => {}).finally(() => { --this.jobs; });
    return result;
  }
  command(command) {
    return this.enqueue(() => this.exchange(command, (m) => m.type === 'ack' && m.cmd === command.split(' ')[0]));
  }
  async handshake() {
    const hello = await this.enqueue(() => this.exchange(`HELLO ${PROTOCOL}`, (m) => m.type === 'hello'));
    if (hello.device !== DEVICE || hello.protocol !== PROTOCOL || hello.registers !== REGISTER_COUNT) {
      this.fail(new Error('A porta selecionada não contém um programa Malth Pro compatível.'));
      throw new Error('O Arduino precisa ter o programa Malth Pro 0.1.0 ou compatível.');
    }
    this.connected = true;
    this.heartbeat = setInterval(() => {
      if (this.connected && this.jobs === 0) this.command('PING').catch(() => {});
    }, 500);
    return hello;
  }
  sendProfile(profile, persist = false) {
    const frames = profileFrames(profile); // Validar tudo antes de interromper o motor.
    return this.enqueue(async () => {
      for (const frame of frames) {
        const command = frame.split(' ')[0];
        await this.exchange(frame, (m) => m.type === 'ack' && m.cmd === command);
      }
      if (persist) await this.exchange('SAVE', (m) => m.type === 'ack' && m.cmd === 'SAVE');
      return { sent: true, applied: true, persisted: persist };
    });
  }
  fail(error) {
    if (this.closed) return;
    error = new Error(deviceErrorMessage(error));
    this.closed = true; this.connected = false; clearInterval(this.heartbeat);
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(error); this.pending = null; }
    if (this.port.isOpen) this.port.close(() => {});
    this.onLost(error);
  }
  close() { this.fail(new Error('Conexão encerrada.')); }
}
module.exports = { DeviceLink };
