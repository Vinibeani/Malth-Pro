const { encodeProfile } = require('./device-protocol.cjs');

// A sessao aplica o perfil antes de habilitar o motor. A centralizacao inicial
// usa a posicao atual, conforme a opcao escolhida pelo usuario (encoder sem Z).
class MotorSession {
  constructor(link) {
    this.link = link;
    this.queue = Promise.resolve();
    this.jobs = 0;
    this.centered = false;
    this.profileApplied = false;
    this.forceRequested = true;
    this.intent = 0;
    this.pendingCenters = 0;
  }

  enqueue(work) {
    if (this.jobs >= 8) return Promise.reject(new Error('Aguarde a operação atual do Arduino terminar.'));
    ++this.jobs;
    const result = this.queue.then(() => {
      if (this.link.closed || !this.link.connected) throw new Error('Arduino desconectado.');
      return work();
    });
    this.queue = result.catch(() => {}).finally(() => { --this.jobs; });
    return result;
  }

  async resumeForce() {
    if (!this.forceRequested || !this.centered || !this.profileApplied) return false;
    await this.link.command('ARM');
    return true;
  }

  sendProfile(profile, persist = false) {
    encodeProfile(profile); // Rejeitar um perfil invalido antes de alterar o motor.
    return this.enqueue(async () => {
      this.profileApplied = false;
      const result = await this.link.sendProfile(profile, persist);
      this.profileApplied = true;
      if (this.forceRequested && !this.centered && this.pendingCenters === 0) {
        await this.link.command('CENTER');
        this.centered = true;
      }
      const forceEnabled = this.pendingCenters === 0 ? await this.resumeForce() : false;
      return { ...result, forceEnabled };
    });
  }

  command(command) {
    if (command === 'DISARM') {
      // Registrar Esc antes de esperar a fila: uma gravacao em andamento nao
      // pode religar a forca ao terminar. Centralizar e uma retomada explicita.
      this.forceRequested = false;
      ++this.intent;
      return this.enqueue(() => this.link.command('DISARM'));
    }
    if (command === 'CENTER') {
      this.forceRequested = true;
      const intent = ++this.intent;
      ++this.pendingCenters;
      return this.enqueue(async () => {
        const result = await this.link.command('CENTER');
        this.centered = true;
        const forceEnabled = intent === this.intent ? await this.resumeForce() : false;
        return { ...result, forceEnabled };
      }).finally(() => { --this.pendingCenters; });
    }
    if (command === 'ARM') {
      this.forceRequested = true;
      const intent = ++this.intent;
      return this.enqueue(async () => {
        if (intent !== this.intent) return { type: 'ack', cmd: 'ARM', cancelled: true };
        if (!this.centered || !this.profileApplied) throw new Error('Centralize o volante após aplicar o perfil.');
        return this.link.command('ARM');
      });
    }
    throw new TypeError('Comando inválido.');
  }
}

module.exports = { MotorSession };
