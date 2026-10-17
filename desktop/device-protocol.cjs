const REGISTER_COUNT = 65;
const PROTOCOL = 2;
const DEVICE = 'MalthPro';

function number(value, fallback, lo, hi, label) {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(result) || result < lo || result > hi) throw new RangeError(`${label}: valor permitido de ${lo} a ${hi}.`);
  return Math.round(result);
}

function encodeProfile(profile) {
  if (!profile || typeof profile.settings !== 'object' || !profile.settings) throw new TypeError('Perfil inválido.');
  const s = profile.settings;
  if (s.driveModeCfg !== undefined && s.driveModeCfg !== '2PWM + 1DIR') {
    throw new RangeError('Esta versão usa BTS7960 em 2PWM + 1DIR, conforme sua pinagem.');
  }
  if (s.useIndexCfg) throw new RangeError('O sinal Z não está conectado no esquema confirmado. Desmarque Índice Z.');
  const pwm = Number(String(s.pwmFreqCfg ?? '16KHz').replace(/khz/i, '').trim()) * 1000;
  const regs = [
    number(s.cprCfg, 4000, 4, 32000, 'CPR'),
    number(s.steeringAngleCfg, 540, 30, 2160, 'Ângulo'),
    s.invertSteeringCfg ? 1 : 0,
    number(pwm, 16000, 4000, 20000, 'Frequência PWM'), 2, 0,
    (s.enableAccelCfg !== false ? 1 : 0) | (s.enableBrakeCfg !== false ? 2 : 0) |
    (s.enableClutchCfg ? 4 : 0) | (s.enableHandbrakeCfg ? 8 : 0),
  ];
  for (const pedal of ['accel', 'brake', 'clutch', 'handbrake']) {
    const label = { accel: 'Acelerador', brake: 'Freio', clutch: 'Embreagem', handbrake: 'Freio de mão' }[pedal];
    const calibration = profile.pedalCalibration?.[pedal] ?? { min: 0, max: 100 };
    const min = Number(calibration.min ?? 0);
    const max = Number(calibration.max ?? 100);
    number(min, 0, 0, 100, `${label} mínimo`);
    number(max, 100, 0, 100, `${label} máximo`);
    if (min >= max) throw new RangeError(`${label}: mínimo precisa ser menor que máximo.`);
    regs.push(Math.round(min * 1023 / 100), Math.round(max * 1023 / 100));
  }
  let previous = 0;
  for (let percent = 10; percent <= 100; percent += 10) {
    const value = number(s[`brakeLin${percent}Cfg`], Math.round(percent * 1023 / 100), previous, 1023, `Linearidade ${percent}%`);
    regs.push(value); previous = value;
  }
  regs.push(number(s.shifterModeCfg, 1, 0, 1, 'Modo do câmbio'));
  for (const [key, fallback, label] of [['yLowCfg', 256, 'Y inferior'], ['yHighCfg', 768, 'Y superior'],
    ['xLowCfg', 256, 'X inferior'], ['xMidCfg', 512, 'X central'], ['xHighCfg', 768, 'X superior']]) {
    regs.push(number(s[key], fallback, 0, 1023, label));
  }
  if (regs[26] >= regs[27] || regs[28] >= regs[29] || regs[29] >= regs[30]) {
    throw new RangeError('Ajuste os limites: Y inferior < Y superior e X inferior < X central < X superior.');
  }
  ['1', '2', '3', '4', '5', '6', '7', 'R'].forEach((gear, i) => {
    regs.push(number(s[`gear${gear}XCfg`], 128 + Math.floor(i / 2) * 256, 0, 1023, `Marcha ${gear} X`));
    regs.push(number(s[`gear${gear}YCfg`], i % 2 ? 768 : 256, 0, 1023, `Marcha ${gear} Y`));
  });
  for (const [key, fallback, label] of [
    ['hardLockCfg', 50, 'Batente rígido'], ['softLockCfg', 50, 'Batente suave'],
    ['minforceCfg', 5, 'Força mínima'], ['maxForceCfg', 25, 'Força máxima'],
    ['gainConstantCfg', 70, 'Força constante'], ['gainSpringCfg', 50, 'Força de mola'], ['gainSineCfg', 50, 'Força senoidal'],
    ['gainDamperCfg', 50, 'Amortecimento'], ['gainFrictionCfg', 100, 'Força de atrito'], ['gainInertiaCfg', 50, 'Força de inércia'],
    ['damperFilterCfg', 20, 'Filtro de amortecimento'], ['frictionFilterCfg', 20, 'Filtro de atrito'], ['inertiaFilterCfg', 20, 'Filtro de inércia'],
  ]) regs.push(number(s[key], fallback, 0, 100, label));
  if (regs[49] > regs[50]) throw new RangeError('Força mínima precisa ser menor ou igual à força máxima.');
  const effect = ['Off', 'Spring', 'Damper', 'Friction'].indexOf(s.effectTypeCfg ?? 'Off');
  if (effect < 0) throw new RangeError('Efeito fora do jogo inválido.');
  regs.push(effect, number(s.desktopEffectForceCfg, 0, 0, 100, 'Força fora do jogo'));
  for (const key of ['constantScaleCfg', 'springScaleCfg', 'sineScaleCfg']) {
    regs.push(number(s[key], 50, 0, 100, 'Escala da força'));
  }
  if (regs.length !== REGISTER_COUNT) throw new Error('Versão do protocolo inconsistente.');
  return regs;
}

function profileFrames(profile) {
  const regs = encodeProfile(profile);
  const frames = ['BEGIN'];
  for (let offset = 0; offset < regs.length; offset += 6) {
    frames.push(`SET ${offset} ${regs.slice(offset, offset + 6).join(' ')}`);
  }
  frames.push('COMMIT');
  return frames;
}
const protocolErrors = {
  PROTOCOL: 'A versão de comunicação não é compatível.',
  HELLO_REQUIRED: 'Reconecte o Arduino antes de enviar os ajustes.',
  SAVING: 'O Arduino está gravando. Aguarde a conclusão.',
  ORDER: 'Os ajustes chegaram fora de ordem. Envie o perfil novamente.',
  VALUE: 'O Arduino recebeu um valor inválido.', EMPTY: 'O Arduino recebeu uma configuração vazia.',
  CONFIG: 'Confira os limites e as opções do perfil antes de salvar.',
  COMMAND_OR_CENTER_REQUIRED: 'Centralize o volante antes de ativar a força.',
  LINE_TOO_LONG: 'A mensagem de configuração ultrapassou o tamanho permitido.',
};
function deviceErrorMessage(error) {
  const message = String(error?.message || error || 'Não foi possível comunicar com o Arduino.');
  if (/access.*denied|permission denied|resource busy|cannot lock/i.test(message)) return 'A porta USB está ocupada ou sem permissão. Feche outros programas conectados ao Arduino.';
  if (/file not found|cannot find|no such file|port is not open|invalid handle/i.test(message)) return 'A porta USB não está disponível. Reconecte o Arduino e selecione a porta novamente.';
  return message;
}
module.exports = { PROTOCOL, DEVICE, REGISTER_COUNT, encodeProfile, profileFrames, protocolErrors, deviceErrorMessage };
