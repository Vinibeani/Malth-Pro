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
    this.appliedEncoderConfig = null;
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
    // Capturar o perfil ao entrar na fila: os valores enviados e comparados
    // devem ser os mesmos, mesmo se o chamador editar seu objeto depois.
    const snapshot = JSON.parse(JSON.stringify(profile));
    const registers = encodeProfile(snapshot); // Validar antes de alterar o motor.
    const encoderConfig = { cpr: registers[0], invert: registers[2] };
    return this.enqueue(async () => {
      this.profileApplied = false;
      const encoderChanged = this.appliedEncoderConfig && (
        this.appliedEncoderConfig.cpr !== encoderConfig.cpr ||
        this.appliedEncoderConfig.invert !== encoderConfig.invert
      );
      let result;
      try {
        result = await this.link.sendProfile(snapshot, persist);
      } catch (error) {
        // COMMIT pode ter sido aplicado antes de perdermos seu ACK ou o SAVE.
        // Sem confirmacao, nao reutilizar uma centralizacao possivelmente antiga.
        this.centered = false;
        this.appliedEncoderConfig = null;
        throw error;
      }
      // O COMMIT do protocolo 2 invalida o centro quando CPR ou INVERT mudam.
      // Espelhar essa regra antes de qualquer tentativa de retomar a forca.
      if (encoderChanged) this.centered = false;
      this.appliedEncoderConfig = encoderConfig;
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
