(() => {
  const STORAGE_KEY = 'malth-control-studio-profiles-v1';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const pedalAxes = { accel: 1, brake: 2, clutch: 3, handbrake: 4 };
  const shifterAxes = { x: 5, y: 6 };
  const pedalRestAtHigh = new Map();
  const latestPedalReadings = {};
  let activeGamepadId = '';
  let lastConnectionLabel = '';
  let nativeDeviceConnected = false;
  let nativeState = null;
  let nativeStateTime = 0;
  let latestShifterPosition = null;
  let latestSteeringAxis = null;
  let latestSteeringFromFirmware = false;
  let steeringCenterAxis = 0;
  let sequentialGear = 0;
  let sequentialShiftDirection = 0;
  let shifterCalibrationMode = false;
  let capturedGears = new Set();
  const matrixKeys = [];
  let lastMatrixReading;
  let matrixButtonMask = null;
  const calibrationDefaults = () => ({
    accel: { min: 0, max: 100 },
    brake: { min: 0, max: 100 },
    clutch: { min: 0, max: 100 },
    handbrake: { min: 0, max: 100 },
  });

  const brakeCurveDefaults = {
    brakeLin0Cfg: 0,
    brakeLin10Cfg: 102,
    brakeLin20Cfg: 205,
    brakeLin30Cfg: 307,
    brakeLin40Cfg: 409,
    brakeLin50Cfg: 512,
    brakeLin60Cfg: 614,
    brakeLin70Cfg: 716,
    brakeLin80Cfg: 818,
    brakeLin90Cfg: 921,
    brakeLin100Cfg: 1023,
  };

  const shifterGearDefaults = {
    gear1XCfg: 128, gear1YCfg: 256,
    gear2XCfg: 128, gear2YCfg: 768,
    gear3XCfg: 384, gear3YCfg: 256,
    gear4XCfg: 384, gear4YCfg: 768,
    gear5XCfg: 640, gear5YCfg: 256,
    gear6XCfg: 640, gear6YCfg: 768,
    gear7XCfg: 896, gear7YCfg: 256,
    gearRXCfg: 896, gearRYCfg: 768,
  };

  // Chaves do arquivo de configuração fornecido para a edição Pro.
  const defaults = {
    cprCfg: 4000,
    hbridgeCfg: 'BTS7960',
    useIndexCfg: false,
    indexForceCfg: 0,
    driveModeCfg: '2PWM + 1DIR',
    pwmFreqCfg: '16KHz',
    themesColorCfg: '#FF9E9E9E',
    steeringImageCfg: '',
    steeringAngleCfg: 540,
    invertSteeringCfg: false,
    enableAccelCfg: true,
    accelDzTopCfg: 0,
    accelDzBotCfg: 0,
    accelCurveCfg: 'Linear',
    accelLin0Cfg: 0,
    accelLin20Cfg: 20,
    accelLin40Cfg: 40,
    accelLin60Cfg: 60,
    accelLin80Cfg: 80,
    accelLin100Cfg: 100,
    enableBrakeCfg: true,
    brakeDzTopCfg: 0,
    brakeDzBotCfg: 0,
    brakeCurveCfg: 'Exponential',
    ...brakeCurveDefaults,
    enableClutchCfg: false,
    clutchDzTopCfg: 0,
    clutchDzBotCfg: 0,
    clutchCurveCfg: 'S curve',
    clutchLin0Cfg: 0,
    clutchLin20Cfg: 20,
    clutchLin40Cfg: 40,
    clutchLin60Cfg: 60,
    clutchLin80Cfg: 80,
    clutchLin100Cfg: 100,
    enableHandbrakeCfg: false,
    buttonmodeCfg: 0,
    spibuttonmodeCfg: 0,
    strengthCfg: 0,
    minforceCfg: 5,
    enableStopCfg: false,
    hardLockCfg: 50,
    softLockCfg: 50,
    maxForceCfg: 95,
    effectTypeCfg: 'Off',
    desktopEffectForceCfg: 0,
    enableAutoCenterCfg: false,
    autoCenterCoefficientCfg: 45,
    gainConstantCfg: 70,
    gainSineCfg: 50,
    gainSpringCfg: 50,
    gainSquareCfg: 100,
    gainFrictionCfg: 100,
    gainDamperCfg: 50,
    gainTriangleCfg: 100,
    gainInertiaCfg: 50,
    constantScaleCfg: 50,
    springScaleCfg: 50,
    sineScaleCfg: 50,
    damperFilterCfg: 20,
    frictionFilterCfg: 20,
    inertiaFilterCfg: 20,
    shifterModeCfg: 1,
    showMatrixCfg: false,
    yHighCfg: 768,
    yLowCfg: 256,
    xHighCfg: 768,
    xMidCfg: 512,
    xLowCfg: 256,
    xMinCfg: 0,
    xMaxCfg: 1023,
    yMinCfg: 0,
    yMaxCfg: 1023,
    effilterCfg: 0,
    ...shifterGearDefaults,
    vescUartMode: 0,
    vescCurrent: '',
    psuVoltage: 36,
    brakeResistance: 6,
  };

  const effectOptions = [
    { group: 'forceEffects', name: 'Força constante', force: 'gainConstantCfg', adjustment: 'constantScaleCfg', label: 'Escala' },
    { group: 'forceEffects', name: 'Força de mola', force: 'gainSpringCfg', adjustment: 'springScaleCfg', label: 'Escala' },
    { group: 'forceEffects', name: 'Força senoidal', force: 'gainSineCfg', adjustment: 'sineScaleCfg', label: 'Escala' },
    { group: 'filterEffects', name: 'Amortecimento', force: 'gainDamperCfg', adjustment: 'damperFilterCfg', label: 'Filtro' },
    { group: 'filterEffects', name: 'Força de atrito', force: 'gainFrictionCfg', adjustment: 'frictionFilterCfg', label: 'Filtro' },
    { group: 'filterEffects', name: 'Força de inércia', force: 'gainInertiaCfg', adjustment: 'inertiaFilterCfg', label: 'Filtro' },
  ];
  // Valores internos preservados para os perfis e o protocolo do Arduino.
  const effectTypeLabels = { Off: 'Desligado', Spring: 'Mola', Damper: 'Amortecimento', Friction: 'Atrito' };
  const userErrorMessage = (error) => String(error?.message || 'Não foi possível concluir a operação.')
    .replace(/^Error invoking remote method '[^']+': (?:[A-Za-z]*Error): /, '');
  const gainDefaults = {
    gainConstantCfg: 70, gainSpringCfg: 50, gainSineCfg: 50,
    constantScaleCfg: 50, springScaleCfg: 50, sineScaleCfg: 50,
    gainDamperCfg: 50, gainFrictionCfg: 100, gainInertiaCfg: 50,
    damperFilterCfg: 20, frictionFilterCfg: 20, inertiaFilterCfg: 20,
  };

  const newProfile = (name = 'Padrão', base = false) => ({
    id: `pro-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    name,
    variant: 'pro',
    settings: clone(defaults),
    pedalCalibration: calibrationDefaults(),
    base,
  });

  function clampSteeringAngle(settings) {
    const angle = Number(settings.steeringAngleCfg);
    settings.steeringAngleCfg = Number.isFinite(angle)
      ? Math.max(30, Math.min(1080, Math.round(angle / 10) * 10)) : defaults.steeringAngleCfg;
  }

  function readStoredProfiles() {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current !== null) return JSON.parse(current);
    // Reconhecer perfis de versoes anteriores pelo formato do armazenamento.
    for (let index = 0; index < localStorage.length; ++index) {
      const key = localStorage.key(index);
      if (!key || key === STORAGE_KEY || !key.endsWith('-control-studio-profiles-v1')) continue;
      try {
        const candidate = JSON.parse(localStorage.getItem(key));
        if (!Array.isArray(candidate) || !candidate.length || !candidate.every((profile) =>
          profile && ['pro', 'm3'].includes(profile.variant) && typeof profile.name === 'string' &&
          profile.settings && typeof profile.settings === 'object')) continue;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(candidate)); } catch { /* Leitura preservada se o armazenamento estiver cheio. */ }
        return candidate;
      } catch { /* Ignorar dados que nao correspondem a perfis do aplicativo. */ }
    }
    return null;
  }

  function loadProfiles() {
    const initial = newProfile('Padrão', true);
    try {
      const stored = readStoredProfiles();
      if (!Array.isArray(stored)) return [initial];
      const profiles = stored
        .filter((profile) => profile && ['pro', 'm3'].includes(profile.variant) &&
          typeof profile.name === 'string' && profile.settings && typeof profile.settings === 'object')
        .map((profile) => {
          const settings = clone(defaults);
          Object.keys(settings).forEach((key) => {
            if (Object.hasOwn(profile.settings, key)) settings[key] = profile.settings[key];
          });
          clampSteeringAngle(settings);
          const calibration = calibrationDefaults();
          Object.keys(calibration).forEach((pedal) => {
            const saved = profile.pedalCalibration?.[pedal];
            if (saved && Number.isFinite(Number(saved.min)) && Number.isFinite(Number(saved.max))) {
              calibration[pedal] = { min: Number(saved.min), max: Number(saved.max) };
            }
          });
          return {
            id: String(profile.id || `pro-${Math.random().toString(36).slice(2)}`),
            name: profile.name.slice(0, 48),
            variant: 'pro',
            settings,
            pedalCalibration: calibration,
            base: Boolean(profile.base),
          };
        });
      if (!profiles.some((profile) => profile.base)) profiles.unshift(initial);
      return profiles;
    } catch {
      return [initial];
    }
  }

  let profiles = loadProfiles();
  let activeProfile = clone(profiles.find((profile) => profile.base) || profiles[0]);
  let dirty = false;
  let toastTimer;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }

  function markDirty() {
    dirty = true;
    $('#saveState').textContent = 'Alterações pendentes';
    $('#saveState').classList.add('is-dirty');
  }

  function updateRangeFill(input) {
    if (input.type !== 'range') return;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || 0);
    const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty('--range-progress', `${Math.max(0, Math.min(100, progress))}%`);
  }

  function renderGainControls() {
    ['forceEffects', 'filterEffects'].forEach((group) => {
      const root = $(`#${group}`);
      root.replaceChildren();
      effectOptions.filter((effect) => effect.group === group).forEach((effect) => {
        const card = document.createElement('section');
        card.className = 'panel effect-card';
        card.innerHTML = `<div class="effect-head"><span>${effect.name}</span><span><b data-value="${effect.force}"></b>%</span></div><input class="range-input" type="range" min="0" max="100" data-setting="${effect.force}" aria-label="${effect.name}"><div class="effect-secondary"><span>${effect.label}</span><span><b data-value="${effect.adjustment}"></b>%</span></div><input class="range-input" type="range" min="0" max="100" data-setting="${effect.adjustment}" aria-label="${effect.label} ${effect.name}">`;
        root.append(card);
      });
    });
  }

  function renderBrakeLinearity() {
    const root = $('#linearityRows');
    root.replaceChildren();
    for (let percent = 10; percent <= 100; percent += 10) {
      const key = `brakeLin${percent}Cfg`;
      const row = document.createElement('div');
      row.className = 'linearity-row';
      row.innerHTML = `<span>${percent}%</span><input class="range-input" type="range" min="0" max="1023" step="1" data-setting="${key}" aria-label="Conversão do freio em ${percent}%"><output data-value="${key}"></output><button class="curve-nudge" type="button" data-nudge="-1" data-target="${key}" aria-label="Diminuir ${percent}%">‹</button><button class="curve-nudge" type="button" data-nudge="1" data-target="${key}" aria-label="Aumentar ${percent}%">›</button>`;
      root.append(row);
    }
  }

  function drawBrakeCurve() {
    const coordinates = [];
    for (let percent = 0; percent <= 100; percent += 10) {
      const setting = activeProfile.settings[`brakeLin${percent}Cfg`];
      const value = Math.max(0, Math.min(1023, Number(setting) || 0));
      const x = 42 + (percent / 100) * 218;
      const y = 210 - (value / 1023) * 195;
      coordinates.push({ x, y, value });
    }
    $('#brakeCurvePath').setAttribute('d', coordinates.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '));
    $('#brakeCurvePoints').innerHTML = coordinates.map(({ x, y }) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2"></circle>`).join('');
    $('#brakeCurveLabels').innerHTML = coordinates.map(({ x, y, value }, index) => {
      const labelY = y < 27 ? y + 10 : y - 6;
      const labelX = index === coordinates.length - 1 ? x - 7 : x + 1;
      return `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}">${value}</text>`;
    }).join('');
    $('#curveConvReadout').textContent = String(coordinates.at(-1).value);
  }

  function nearestShifterGear(position) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
    const settings = activeProfile.settings;
    const lowY = Number(settings.yLowCfg), highY = Number(settings.yHighCfg);
    if (position.y > lowY && position.y < highY) return null;
    const column = (x) => x <= Number(settings.xLowCfg) ? 0 : x <= Number(settings.xMidCfg) ? 1 : x <= Number(settings.xHighCfg) ? 2 : 3;
    const liveColumn = column(position.x), bottom = position.y >= highY;
    const distances = [];
    ['1', '2', '3', '4', '5', '6', '7', 'R'].forEach((gear) => {
      const x = Number(activeProfile.settings[`gear${gear}XCfg`]);
      const y = Number(activeProfile.settings[`gear${gear}YCfg`]);
      if (column(x) !== liveColumn || (bottom ? y < highY : y > lowY)) return;
      const distance = Math.hypot((position.x - x) / 1023, (position.y - y) / 1023);
      distances.push({ gear, distance });
    });
    distances.sort((a, b) => a.distance - b.distance);
    const [nearest, runnerUp] = distances;
    return nearest && !runnerUp ? nearest.gear : null;
  }

  function updateSequentialGear(position) {
    if (!position || !Number.isFinite(position.y)) return;
    const firstThreshold = Number(activeProfile.settings.yLowCfg);
    const secondThreshold = Number(activeProfile.settings.yHighCfg);
    const lowThreshold = Math.min(firstThreshold, secondThreshold);
    const highThreshold = Math.max(firstThreshold, secondThreshold);
    const direction = position.y <= lowThreshold ? 1 : position.y >= highThreshold ? -1 : 0;
    if (direction === 0) {
      sequentialShiftDirection = 0;
      return;
    }
    if (direction === sequentialShiftDirection) return;
    sequentialShiftDirection = direction;
    sequentialGear = Math.max(0, Math.min(7, sequentialGear + direction));
  }

  function renderShifterPosition() {
    const point = $('#shifterPoint');
    const xReadout = $('#shifterXReadout');
    const yReadout = $('#shifterYReadout');
    const gate = $('#shifterGate');
    const settings = activeProfile.settings;
    const showButtons = settings.showMatrixCfg === true;
    $('.shifter-layout').classList.toggle('is-buttons', showButtons);
    $('[data-setting="shifterModeCfg"]').value = showButtons ? 'buttons' : String(settings.shifterModeCfg);
    if (showButtons) {
      shifterCalibrationMode = false;
      const count = matrixKeys.filter((key) => key.classList.contains('is-pressed')).length;
      $('#currentGear').textContent = matrixButtonMask === null ? '—' : String(count);
      $('#shifterModeHint').textContent = 'Botões pressionados · matriz 4×4';
      return;
    }
    const isHShifter = String(settings.shifterModeCfg) === '1';
    const isSequential = !isHShifter;
    if (isSequential && shifterCalibrationMode) shifterCalibrationMode = false;
    const consolePanel = $('.shifter-console-panel');
    const modePanel = $('.shifter-mode-panel');
    consolePanel.classList.toggle('is-sequential', isSequential);
    modePanel.classList.toggle('is-sequential', isSequential);
    $('#shifterModeHint').textContent = isSequential
      ? 'Eixo Y · movimento frente / trás'
      : 'Movimento X/Y · configure cada marcha';
    $('#mapYTopLabel').textContent = isSequential ? 'Frente' : 'Y max';
    $('#mapYBottomLabel').textContent = isSequential ? 'Trás' : 'Y min';
    gate.setAttribute('aria-label', isSequential ? 'Eixo Y do câmbio sequencial' : 'Mapa X/Y do câmbio');
    const hasLivePosition = latestShifterPosition && Number.isFinite(latestShifterPosition.y) &&
      (isSequential || Number.isFinite(latestShifterPosition.x));
    let activeGear = isHShifter
      ? nearestShifterGear(hasLivePosition ? latestShifterPosition : null)
      : sequentialGear > 0 ? String(sequentialGear) : null;
    if (nativeDeviceConnected && nativeState && performance.now() - nativeStateTime < 1500 && !dirty) {
      activeGear = nativeState.gear === 8 ? 'R' : nativeState.gear ? String(nativeState.gear) : null;
    }
    const guidePositions = {
      xHighGuide: ['left', settings.xHighCfg],
      xMidGuide: ['left', settings.xMidCfg],
      xLowGuide: ['left', settings.xLowCfg],
      yHighGuide: ['top', settings.yHighCfg],
      yLowGuide: ['top', settings.yLowCfg],
    };
    const mapPercent = (value) => Math.max(0, Math.min(1023, Number(value) || 0)) / 1023 * 100;
    Object.entries(guidePositions).forEach(([id, [axis, value]]) => {
      $(`#${id}`).style[axis] = `${mapPercent(value)}%`;
    });
    const columns = [0, settings.xLowCfg, settings.xMidCfg, settings.xHighCfg, 1023].map(mapPercent);
    const topEnd = mapPercent(settings.yLowCfg);
    const bottomStart = mapPercent(settings.yHighCfg);
    if (hasLivePosition) {
      const xPercent = isSequential ? 50 : (latestShifterPosition.x / 1023) * 100;
      const yPercent = (latestShifterPosition.y / 1023) * 100;
      point.style.left = `${xPercent}%`;
      point.style.top = `${yPercent}%`;
      xReadout.textContent = isSequential ? '—' : String(latestShifterPosition.x);
      yReadout.textContent = String(latestShifterPosition.y);
      point.classList.add('is-live');
      point.title = isSequential
        ? `Eixo Y do câmbio: ${latestShifterPosition.y}`
        : `Potenciômetros: X ${latestShifterPosition.x}, Y ${latestShifterPosition.y}`;
    } else {
      point.style.left = '50%';
      point.style.top = '50%';
      xReadout.textContent = '—';
      yReadout.textContent = '—';
      point.classList.remove('is-live');
      point.title = isSequential ? 'Aguardando o eixo Y do câmbio' : 'Aguardando os eixos X/Y do câmbio';
    }
    gate.classList.toggle('is-calibrating', shifterCalibrationMode);
    $$('.gear-cell', gate).forEach((cell) => {
      const gear = cell.dataset.gear;
      const gearIndex = gear === 'R' ? 7 : Number(gear) - 1;
      const column = Math.floor(gearIndex / 2);
      const bottom = gearIndex % 2 === 1;
      // Hit areas and highlights share the adjustable blue XY boundaries.
      cell.style.left = `${columns[column]}%`;
      cell.style.width = `${Math.max(0, columns[column + 1] - columns[column])}%`;
      cell.style.top = `${bottom ? bottomStart : 0}%`;
      cell.style.height = `${bottom ? 100 - bottomStart : topEnd}%`;
      const hasCustomPoint = activeProfile.settings[`gear${gear}XCfg`] !== shifterGearDefaults[`gear${gear}XCfg`] ||
        activeProfile.settings[`gear${gear}YCfg`] !== shifterGearDefaults[`gear${gear}YCfg`];
      cell.classList.toggle('is-active', isHShifter && gear === activeGear);
      cell.classList.toggle('is-captured', capturedGears.has(gear) || hasCustomPoint);
    });
    $('#currentGear').textContent = activeGear || 'N';
    const calibrateButton = $('#calibrateButton');
    calibrateButton.classList.toggle('is-active', shifterCalibrationMode);
    calibrateButton.setAttribute('aria-pressed', String(shifterCalibrationMode));
    calibrateButton.textContent = shifterCalibrationMode ? 'Encerrar calibração' : 'Calibrar ⚒';
    const hint = $('#shifterCalibrationHint');
    hint.hidden = !shifterCalibrationMode;
    hint.textContent = shifterCalibrationMode
      ? `Mova a alavanca e clique em cada marcha para registrar X/Y (${capturedGears.size}/8).`
      : 'Coloque a alavanca em cada marcha e clique no quadrado correspondente.';
  }

  function renderSteeringWheel() {
    const wheel = $('.wheel-illustration');
    const readout = $('#steeringReadout');
    if (!wheel || !readout) return;
    const axis = latestSteeringAxis;
    if (!Number.isFinite(axis)) {
      wheel.style.transform = 'rotate(0deg)';
      readout.textContent = '0°';
      return;
    }

    const centeredAxis = Math.max(-1, Math.min(1, axis)) - steeringCenterAxis;
    const availableRange = centeredAxis >= 0 ? 1 - steeringCenterAxis : steeringCenterAxis + 1;
    const normalized = availableRange > 0 ? Math.max(-1, Math.min(1, centeredAxis / availableRange)) : 0;
    // A telemetria nativa ja inclui INVERT aplicado pelo firmware.
    // Somente a previa de um controle generico precisa desta transformacao.
    const direction = !latestSteeringFromFirmware && activeProfile.settings.invertSteeringCfg ? -1 : 1;
    const angle = Math.round(normalized * Number(activeProfile.settings.steeringAngleCfg) / 2 * direction);
    wheel.style.transform = `rotate(${angle}deg)`;
    readout.textContent = `${angle}°`;
  }

  function createMatrixButtons() {
    const grid = $('#matrixGrid');
    for (let index = 0; index < 16; ++index) {
      const key = document.createElement('div');
      key.className = 'matrix-key is-unavailable';
      key.dataset.matrixButton = String(index + 1);
      key.setAttribute('role', 'img');
      key.setAttribute('aria-label', `Botão ${index + 1}: aguardando leitura`);
      key.innerHTML = `<strong>${index + 1}</strong>`;
      grid.append(key);
      matrixKeys.push(key);
    }
  }

  function renderMatrixButtons(live, gamepad) {
    let mask = null;
    if (live && Number.isInteger(live.buttons)) mask = live.buttons;
    else if (gamepad && /malth/i.test(gamepad.id) && gamepad.buttons.length >= 16) {
      mask = Array.from(gamepad.buttons).slice(0, 16).reduce((bits, button, index) =>
        bits | ((button.pressed || button.value > 0.5) ? 1 << index : 0), 0);
    }
    const available = mask !== null;
    matrixButtonMask = mask;
    const label = available ? 'Conectado' : live ? 'Atualize o firmware do Leonardo' :
      nativeDeviceConnected ? 'Aguardando leitura' : 'Aguardando o volante';
    const reading = `${mask}:${label}`;
    if (reading === lastMatrixReading) return;
    lastMatrixReading = reading;
    matrixKeys.forEach((key, index) => {
      const pressed = available && Boolean(mask & (1 << index));
      const state = available ? pressed ? 'Pressionado' : 'Solto' : '—';
      key.classList.toggle('is-pressed', pressed);
      key.classList.toggle('is-unavailable', !available);
      key.setAttribute('aria-label', `Botão ${index + 1}: ${available ? state.toLowerCase() : 'aguardando leitura'}`);
    });
    if (activeProfile.settings.showMatrixCfg === true) renderShifterPosition();
    $('#matrixConnection').classList.toggle('is-connected', available);
    $('#matrixConnectionLabel').textContent = label;
  }

  function updatePedalMeters() {
    const live = nativeDeviceConnected && performance.now() - nativeStateTime < 1500 ? nativeState : null;
    let gamepad = null;
    if (typeof navigator.getGamepads === 'function') {
      try {
        const connected = Array.from(navigator.getGamepads()).filter((candidate) => candidate?.connected);
        gamepad = connected.find((candidate) => /malth/i.test(candidate.id)) || connected[0] || null;
      } catch {
        gamepad = null;
      }
    }

    const identity = gamepad ? `${gamepad.index}:${gamepad.id}` : '';
    if (identity !== activeGamepadId) {
      activeGamepadId = identity;
      steeringCenterAxis = 0;
      pedalRestAtHigh.clear();
      if (gamepad) {
        Object.values(pedalAxes).forEach((axisIndex) => {
          const initial = Number(gamepad.axes[axisIndex]);
          pedalRestAtHigh.set(axisIndex, Number.isFinite(initial) && initial > 0.75);
        });
      }
    }

    const steeringAxis = live ? live.steering / 32767 : gamepad ? Number(gamepad.axes[0]) : NaN;
    latestSteeringAxis = Number.isFinite(steeringAxis) ? steeringAxis : null;
    latestSteeringFromFirmware = Boolean(live);
    renderSteeringWheel();

    $$('[data-pedal-meter]').forEach((meter) => {
      const pedal = meter.dataset.pedalMeter;
      const enabledKey = { accel: 'enableAccelCfg', brake: 'enableBrakeCfg',
        clutch: 'enableClutchCfg', handbrake: 'enableHandbrakeCfg' }[pedal];
      const enabled = Boolean(activeProfile.settings[enabledKey]);
      meter.setAttribute('aria-disabled', String(!enabled));
      if (!enabled) {
        latestPedalReadings[pedal] = null;
        meter.firstElementChild.style.width = '0%';
        meter.setAttribute('aria-valuenow', '0');
        meter.title = 'Pedal desabilitado';
        return;
      }
      const axisIndex = pedalAxes[pedal];
      const axis = gamepad ? Number(gamepad.axes[axisIndex]) : NaN;
      let rawPercent = 0;
      if (Number.isFinite(axis)) {
        rawPercent = pedalRestAtHigh.get(axisIndex)
          ? ((1 - axis) / 2) * 100
          : ((axis + 1) / 2) * 100;
      }
      const pedalIndex = ['accel', 'brake', 'clutch', 'handbrake'].indexOf(pedal);
      if (live) rawPercent = live.raw[pedalIndex] * 100 / 1023;
      latestPedalReadings[pedal] = live || Number.isFinite(axis) ? rawPercent : null;
      const calibration = activeProfile.pedalCalibration[pedal];
      const min = Number(calibration.min);
      const max = Number(calibration.max);
      const fill = max > min ? Math.max(0, Math.min(100, ((rawPercent - min) / (max - min)) * 100)) : 0;
      meter.firstElementChild.style.width = `${fill}%`;
      meter.setAttribute('aria-valuenow', String(Math.round(fill)));
      meter.title = live ? `Leitura bruta: ${live.raw[pedalIndex]}` : gamepad ? `Eixo ${axisIndex} do controle USB` : 'Aguardando controle USB';
    });

    const xAxis = live ? live.raw[4] / 1023 * 2 - 1 : gamepad ? Number(gamepad.axes[shifterAxes.x]) : NaN;
    const yAxis = live ? live.raw[5] / 1023 * 2 - 1 : gamepad ? Number(gamepad.axes[shifterAxes.y]) : NaN;
    latestShifterPosition = Number.isFinite(xAxis) || Number.isFinite(yAxis)
      ? {
        x: Number.isFinite(xAxis) ? Math.round(((xAxis + 1) / 2) * 1023) : null,
        y: Number.isFinite(yAxis) ? Math.round(((yAxis + 1) / 2) * 1023) : null,
      }
      : null;
    if (String(activeProfile.settings.shifterModeCfg) === '0') {
      if (live && !dirty) sequentialGear = live.gear;
      else updateSequentialGear(latestShifterPosition);
    }
    renderShifterPosition();

    renderMatrixButtons(live, gamepad);

    const status = $('#connectionStatus');
    const connected = Boolean(gamepad) || nativeDeviceConnected;
    const label = connected ? 'Conectado' :
      typeof navigator.getGamepads === 'function' ? 'Aguardando controle' : 'Leitura USB indisponível';
    $('#connectButton').classList.toggle('is-connected', connected);
    if (label !== lastConnectionLabel) {
      status.textContent = label;
      $('#connectionDetails').textContent = label;
      lastConnectionLabel = label;
    }
    requestAnimationFrame(updatePedalMeters);
  }

  function renderProfiles() {
    const selector = $('#profileSelect');
    selector.replaceChildren();
    profiles.forEach((profile) => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      selector.append(option);
    });
    selector.value = activeProfile.id;
    selector.title = activeProfile.name;
    const profileInfo = $('#infoProfile');
    if (profileInfo) profileInfo.textContent = activeProfile.name;
  }

  function renderSettings() {
    // O projeto usa a BTS7960 e encoder A/B, sem indice Z.
    activeProfile.settings.hbridgeCfg = 'BTS7960';
    activeProfile.settings.useIndexCfg = false;
    clampSteeringAngle(activeProfile.settings);
    $('#steeringRange').value = activeProfile.settings.steeringAngleCfg;
    updateRangeFill($('#steeringRange'));

    $$('[data-setting]').forEach((input) => {
      const value = activeProfile.settings[input.dataset.setting];
      if (value === undefined) return;
      if (input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = value;
      updateRangeFill(input);
      if (input.closest('.gain-row')) input.closest('.gain-row').querySelector('output').textContent = `${value}%`;
    });

    $$('[data-capture-pedal]').forEach((button) => {
      const pedal = button.dataset.capturePedal;
      const enabledKey = pedal === 'clutch' ? 'enableClutchCfg' :
        pedal === 'handbrake' ? 'enableHandbrakeCfg' : null;
      button.disabled = Boolean(enabledKey && !activeProfile.settings[enabledKey]);
    });
    $$('.optional-pedal').forEach((row) => {
      const enabledKey = row.dataset.pedal === 'clutch' ? 'enableClutchCfg' : 'enableHandbrakeCfg';
      row.classList.toggle('is-enabled', Boolean(activeProfile.settings[enabledKey]));
    });
    $$('[data-value]').forEach((element) => {
      const value = activeProfile.settings[element.dataset.value];
      element.textContent = value === undefined || value === '' ? '—' : String(value);
    });
    $('#steeringAngleValue').textContent = `${activeProfile.settings.steeringAngleCfg}°`;
    $('#desktopEffectStatus').textContent = effectTypeLabels[activeProfile.settings.effectTypeCfg] || 'Desligado';
    renderDriveMode();
    drawBrakeCurve();
    renderShifterPosition();
    $('#deleteProfile').disabled = Boolean(activeProfile.base);
    renderProfiles();
  }

  function renderDriveMode() {
    $('#driveModeNote').textContent = activeProfile.settings.driveModeCfg === '1PWM + 1DIR'
      ? 'D8: habilitação · D9: PWM · D10: direção. Requer firmware 0.1.2.'
      : 'D8: habilitação comum · D9/D10: PWM. Os modos com 2DIR exigem outra ligação.';
  }

  function persistProfiles() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
      dirty = false;
      $('#saveState').textContent = '';
      $('#saveState').classList.remove('is-dirty');
      return true;
    } catch {
      showToast('Não foi possível salvar o perfil neste computador.');
      return false;
    }
  }

  function validCalibration() {
    for (const [pedal, values] of Object.entries(activeProfile.pedalCalibration)) {
      if (!Number.isFinite(values.min) || !Number.isFinite(values.max) ||
        values.min < 0 || values.max > 100 || values.min >= values.max) {
        const label = ({ accel: 'acelerador', brake: 'freio', clutch: 'embreagem', handbrake: 'freio de mão' })[pedal];
        showToast(`No ${label}, o mínimo precisa ser menor que o máximo.`);
        return false;
      }
    }
    return true;
  }

  async function sendActiveProfileToDevice(persist = false) {
    if (!nativeDeviceConnected || typeof window.malthDesktop?.sendProfile !== 'function') return null;
    try {
    $('#saveState').textContent = 'Enviando ao Arduino…';
    const result = await window.malthDesktop.sendProfile({
      name: activeProfile.name,
      settings: clone(activeProfile.settings),
      pedalCalibration: clone(activeProfile.pedalCalibration),
    }, { persist });
    if (result.applied) $('#saveState').textContent = result.persisted ? 'Salvo' : 'Aplicado ao Arduino';
    return result;
    } catch (error) {
      $('#saveState').textContent = 'Perfil local · não aplicado';
      showToast(userErrorMessage(error));
      return null;
    }
  }

  window.malthDesktop?.onDeviceState((event) => {
    nativeDeviceConnected = event.state === 'connected';
    if (event.state === 'connected') sendActiveProfileToDevice();
    if (!nativeDeviceConnected) { nativeState = null; renderMotorState(); }
    if (event.state === 'error') showToast(`USB: ${event.detail || 'não foi possível comunicar com o Arduino.'}`);
  });

  function renderMotorState() {
    $('#motorState').textContent = !nativeDeviceConnected ? 'Aguardando conexão' :
      nativeState?.armed ? 'Force Feedback habilitado · limite 25%' :
      'Força interrompida · Centralizar para retomar';
    $('#disconnectDevice').disabled = !nativeDeviceConnected;
  }
  window.malthDesktop?.onDeviceMessage((message) => {
    if (message.type !== 'state' || !Array.isArray(message.raw) || message.raw.length !== 6 ||
        message.raw.some((value) => !Number.isInteger(value) || value < 0 || value > 1023) ||
        !Number.isInteger(message.steering) || Math.abs(message.steering) > 32767 ||
        !Number.isInteger(message.gear) || message.gear < 0 || message.gear > 8 ||
        (message.buttons !== undefined && (!Number.isInteger(message.buttons) || message.buttons < 0 || message.buttons > 65535))) return;
    nativeState = message; nativeStateTime = performance.now();
    steeringCenterAxis = 0;
    renderMotorState();
  });

  async function saveCurrentProfile() {
    if (!validCalibration()) return false;
    const current = profiles.find((profile) => profile.id === activeProfile.id);
    if (current) {
      current.name = activeProfile.name;
      current.settings = clone(activeProfile.settings);
      current.pedalCalibration = clone(activeProfile.pedalCalibration);
    }
    if (persistProfiles()) {
      const result = await sendActiveProfileToDevice(true);
      if (nativeDeviceConnected && !result?.applied) { renderSettings(); return false; }
      showToast('Salvo');
    }
    renderSettings();
    return !dirty;
  }

  function switchProfile(profile) {
    if (dirty && !window.confirm('Há alterações sem salvar. Descartá-las?')) {
      renderProfiles();
      return;
    }
    activeProfile = clone(profile);
    capturedGears.clear();
    dirty = false;
    $('#saveState').textContent = '';
    $('#saveState').classList.remove('is-dirty');
    renderSettings();
    sendActiveProfileToDevice();
  }

  function activateTab(tabName) {
    $$('.tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.tab === tabName));
    $$('.page').forEach((page) => page.classList.toggle('is-active', page.id === `page-${tabName}`));
  }

  function capturePedalEndpoint(button) {
    const { capturePedal: pedal, endpoint } = button.dataset;
    const reading = latestPedalReadings[pedal];
    if (!Number.isFinite(reading)) return;
    const value = Math.round(Math.max(0, Math.min(100, reading)) * 100) / 100;
    const calibration = activeProfile.pedalCalibration[pedal];
    const valid = endpoint === 'min' ? value < calibration.max : value > calibration.min;
    if (!valid) return;
    calibration[endpoint] = value;
    renderSettings();
    markDirty();
  }

  function captureShifterGear(cell) {
    if (!shifterCalibrationMode) {
      showToast('Clique em Calibrar antes de registrar as posições das marchas.');
      return;
    }
    if (String(activeProfile.settings.shifterModeCfg) !== '1') {
      showToast('Selecione H-Shifter para calibrar as oito posições.');
      return;
    }
    if (!latestShifterPosition || !Number.isFinite(latestShifterPosition.x) || !Number.isFinite(latestShifterPosition.y)) {
      showToast('Os eixos X/Y do câmbio não estão disponíveis no controle conectado.');
      return;
    }
    const gear = cell.dataset.gear;
    activeProfile.settings[`gear${gear}XCfg`] = latestShifterPosition.x;
    activeProfile.settings[`gear${gear}YCfg`] = latestShifterPosition.y;
    capturedGears.add(gear);
    renderSettings();
    markDirty();
    showToast(`Marcha ${gear}: X ${latestShifterPosition.x}, Y ${latestShifterPosition.y}.`);
  }

  function createProfile() {
    const profile = {
      id: `pro-${Math.random().toString(36).slice(2)}`,
      name: `Perfil ${profiles.length + 1}`,
      variant: 'pro',
      settings: clone(activeProfile.settings),
      pedalCalibration: clone(activeProfile.pedalCalibration),
      base: false,
    };
    profiles.push(profile);
    activeProfile = clone(profile);
    capturedGears.clear();
    renderSettings();
    markDirty();
    showToast(`Perfil ${profile.name} criado.`);
  }

  function openProfileNameDialog() {
    const input = $('#profileNameInput');
    input.value = activeProfile.name;
    input.removeAttribute('aria-invalid');
    $('#profileNameError').hidden = true;
    $('#profileNameDialog').showModal();
    input.focus();
    input.select();
  }

  function saveProfileName(event) {
    event.preventDefault();
    const input = $('#profileNameInput');
    const name = input.value.trim();
    const error = $('#profileNameError');
    const fail = (message) => {
      error.textContent = message;
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    };
    if (!name || name.length > 48) {
      fail('Digite um nome de 1 a 48 caracteres.');
      return;
    }
    // Renomear e uma operacao local. Preservar configuracoes ainda nao salvas,
    // o estado dirty e a sessao do motor, sem reenviar o perfil ao Arduino.
    const renamed = profiles.map((profile) => profile.id === activeProfile.id ? { ...profile, name } : profile);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(renamed)); }
    catch { fail('Não foi possível salvar o nome neste computador.'); return; }
    profiles = renamed;
    activeProfile.name = name;
    renderProfiles();
    $('#profileNameDialog').close();
    showToast('Salvo');
  }

  function deleteProfile() {
    if (activeProfile.base) return;
    profiles = profiles.filter((profile) => profile.id !== activeProfile.id);
    activeProfile = clone(profiles.find((profile) => profile.base) || profiles[0]);
    capturedGears.clear();
    dirty = false;
    persistProfiles();
    renderSettings();
    showToast('Perfil removido.');
  }

  function exportProfile() {
    if (!validCalibration()) return;
    const payload = {
      schemaVersion: 2,
      product: 'Malth Pro',
      exportedAt: new Date().toISOString(),
      profile: {
        name: activeProfile.name,
        settings: activeProfile.settings,
        pedalCalibration: activeProfile.pedalCalibration,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProfile.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}-pro.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Perfil exportado em JSON.');
  }

  function importProfile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        const candidate = payload.profile || payload;
        if (!candidate || !candidate.settings || typeof candidate.settings !== 'object' ||
          (candidate.variant && !['pro', 'm3'].includes(candidate.variant)) ||
          (payload.product && payload.product !== 'Malth Pro')) throw new Error('Formato incompatível');
        const settings = clone(defaults);
        Object.keys(settings).forEach((key) => {
          if (Object.hasOwn(candidate.settings, key)) settings[key] = candidate.settings[key];
        });
        clampSteeringAngle(settings);
        const calibration = calibrationDefaults();
        Object.keys(calibration).forEach((pedal) => {
          const saved = candidate.pedalCalibration?.[pedal];
          if (saved && Number.isFinite(Number(saved.min)) && Number.isFinite(Number(saved.max))) {
            calibration[pedal] = { min: Number(saved.min), max: Number(saved.max) };
          }
        });
        const profile = {
          id: `pro-${Math.random().toString(36).slice(2)}`,
          name: String(candidate.name || 'Perfil importado').slice(0, 48),
          variant: 'pro',
          settings,
          pedalCalibration: calibration,
          base: false,
        };
        profiles.push(profile);
        activeProfile = clone(profile);
        capturedGears.clear();
        renderSettings();
        markDirty();
        showToast(`Perfil ${profile.name} importado. Salve para guardá-lo.`);
      } catch {
        showToast('JSON inválido ou incompatível com a versão Pro.');
      }
    };
    reader.readAsText(file);
  }

  renderGainControls();
  renderBrakeLinearity();
  createMatrixButtons();
  renderMatrixButtons(null, null);
  renderSettings();
  requestAnimationFrame(updatePedalMeters);
  $$('.tab').forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));
  $$('[data-tab-jump]').forEach((button) => button.addEventListener('click', () => activateTab(button.dataset.tabJump)));
  $('#settingsJump').addEventListener('click', () => $('#settingsDialog').showModal());
  const appShell = $('.app-shell');
  const minimizeWindow = $('#minimizeWindow');
  minimizeWindow.addEventListener('click', () => {
    const minimized = appShell.classList.toggle('is-minimized');
    minimizeWindow.setAttribute('aria-expanded', String(!minimized));
    minimizeWindow.setAttribute('aria-label', minimized ? 'Restaurar' : 'Minimizar');
    minimizeWindow.title = minimized ? 'Restaurar' : 'Minimizar';
    if (minimized) $$('dialog[open]').forEach((dialog) => dialog.close());
  });
  $('#closeWindow').addEventListener('click', () => {
    $$('dialog[open]').forEach((dialog) => dialog.close());
    appShell.classList.remove('is-minimized');
    appShell.classList.add('is-closed');
    $('#closedState').hidden = false;
    $('#reopenApp').focus();
  });
  $('#reopenApp').addEventListener('click', () => {
    appShell.classList.remove('is-closed', 'is-minimized');
    minimizeWindow.setAttribute('aria-expanded', 'true');
    minimizeWindow.setAttribute('aria-label', 'Minimizar');
    minimizeWindow.title = 'Minimizar';
    $('#closedState').hidden = true;
    $('#settingsJump').focus();
  });

  $('#profileSelect').addEventListener('change', (event) => {
    const profile = profiles.find((item) => item.id === event.target.value);
    if (profile) switchProfile(profile);
  });

  function selectShifterView(value) {
    if (!['0', '1', 'buttons'].includes(value)) return;
    const showButtons = value === 'buttons';
    const changed = (activeProfile.settings.showMatrixCfg === true) !== showButtons ||
      (!showButtons && String(activeProfile.settings.shifterModeCfg) !== value);
    activeProfile.settings.showMatrixCfg = showButtons;
    // Botoes e uma visualizacao da matriz ja habilitada. O modo fisico do
    // cambio continua 0/1 para preservar seu funcionamento e o protocolo.
    if (!showButtons) activeProfile.settings.shifterModeCfg = Number(value);
    if (changed) markDirty();
    renderShifterPosition();
  }

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (input.matches('[data-setting="shifterModeCfg"]')) {
      selectShifterView(input.value);
      return;
    }
    if (input.matches('[data-setting]')) {
      const value = input.type === 'checkbox' ? input.checked :
        (input.type === 'number' || input.type === 'range') ? (input.value === '' ? '' : Number(input.value)) : input.value;
      activeProfile.settings[input.dataset.setting] = value;
      markDirty();
      updateRangeFill(input);
      $$(`[data-value="${input.dataset.setting}"]`).forEach((element) => {
        element.textContent = value === '' ? '—' : String(value);
      });
      if (input.id === 'steeringRange') $('#steeringAngleValue').textContent = `${value}°`;
      if (input.dataset.setting === 'effectTypeCfg') $('#desktopEffectStatus').textContent = effectTypeLabels[value] || 'Desligado';
      if (input.dataset.setting === 'driveModeCfg') renderDriveMode();
      if (input.dataset.setting.startsWith('brakeLin')) drawBrakeCurve();
      if (['shifterModeCfg', 'yHighCfg', 'yLowCfg', 'xHighCfg', 'xMidCfg', 'xLowCfg'].includes(input.dataset.setting)) {
        renderShifterPosition();
      }
      if (input.dataset.setting === 'enableClutchCfg' || input.dataset.setting === 'enableHandbrakeCfg') {
        const pedal = input.dataset.setting === 'enableClutchCfg' ? 'clutch' : 'handbrake';
        const row = $(`.optional-pedal[data-pedal="${pedal}"]`);
        row.classList.toggle('is-enabled', Boolean(value));
        row.querySelectorAll('[data-capture-pedal]').forEach((button) => { button.disabled = !value; });
      }
    }
  });

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (!input.matches('[data-setting="shifterModeCfg"]')) return;
    selectShifterView(input.value);
  });

  $('#newProfile').addEventListener('click', createProfile);
  $('#renameProfile').addEventListener('click', openProfileNameDialog);
  $('#profileNameForm').addEventListener('submit', saveProfileName);
  $('#closeProfileName').addEventListener('click', () => $('#profileNameDialog').close());
  $('#cancelProfileName').addEventListener('click', () => $('#profileNameDialog').close());
  $('#deleteProfile').addEventListener('click', deleteProfile);
  $('#saveProfile').addEventListener('click', saveCurrentProfile);
  $('#exportProfile').addEventListener('click', exportProfile);
  $('#importProfile').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (event) => {
    if (event.target.files?.[0]) importProfile(event.target.files[0]);
    event.target.value = '';
  });
  $('#resetGains')?.addEventListener('click', () => {
    Object.entries(gainDefaults).forEach(([key, value]) => { activeProfile.settings[key] = value; });
    renderSettings();
    markDirty();
  });
  $('#connectButton').addEventListener('click', () => $('#connectDialog').showModal());
  $('#centerButton').addEventListener('click', async () => {
    if (nativeDeviceConnected) {
      try {
        const result = await window.malthDesktop.deviceCommand('CENTER');
        steeringCenterAxis = 0;
        showToast(result.forceEnabled ? 'Centro definido · Force Feedback habilitado.' : 'Centro definido para esta sessão.');
      } catch (error) { showToast(userErrorMessage(error)); }
      return;
    }
    if (!Number.isFinite(latestSteeringAxis)) {
      showToast('Conecte o volante USB para definir o centro.');
      return;
    }
    steeringCenterAxis = Math.max(-1, Math.min(1, latestSteeringAxis));
    renderSteeringWheel();
    showToast('Centro do volante definido pela posição atual.');
  });
  $('#settingsSave').addEventListener('click', async () => {
    const saved = await saveCurrentProfile();
    if (saved) $('#settingsDialog').close();
  });
  $('#closeSettings').addEventListener('click', () => $('#settingsDialog').close());
  $('#brakeLinearity').addEventListener('click', () => $('#inputLayout').classList.add('is-linearity'));
  $('#linearityDone').addEventListener('click', () => $('#inputLayout').classList.remove('is-linearity'));
  $('#linearityReset').addEventListener('click', () => {
    Object.assign(activeProfile.settings, clone(brakeCurveDefaults));
    renderSettings();
    markDirty();
  });
  $('#linearityRows').addEventListener('click', (event) => {
    const button = event.target.closest('[data-nudge]');
    if (!button) return;
    const key = button.dataset.target;
    activeProfile.settings[key] = Math.max(0, Math.min(1023, Number(activeProfile.settings[key]) + Number(button.dataset.nudge)));
    renderSettings();
    markDirty();
  });
  $('#calibrateButton').addEventListener('click', () => {
    shifterCalibrationMode = !shifterCalibrationMode;
    renderShifterPosition();
    if (shifterCalibrationMode) showToast('Mova a alavanca e clique nos oito quadrados para registrar cada marcha.');
  });
  $('#closeConnect').addEventListener('click', () => $('#connectDialog').close());
  $('#closeConnectDone').addEventListener('click', () => $('#connectDialog').close());
  $('#disconnectDevice').addEventListener('click', () => window.malthDesktop?.disconnectArduino());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nativeDeviceConnected) window.malthDesktop.deviceCommand('DISARM').catch(() => {});
  });
  $('#saveShifter').addEventListener('click', saveCurrentProfile);
  $('#okShifter').addEventListener('click', () => {
    shifterCalibrationMode = false;
    renderShifterPosition();
    showToast('Ajustes do câmbio aplicados ao perfil.');
  });
  $('#shifterGate').addEventListener('click', (event) => {
    const cell = event.target.closest('[data-gear]');
    if (cell) captureShifterGear(cell);
  });
  $('#resetShifter').addEventListener('click', () => {
    Object.assign(activeProfile.settings, {
      yHighCfg: 768, yLowCfg: 256, xHighCfg: 768, xMidCfg: 512, xLowCfg: 256,
      xMinCfg: 0, xMaxCfg: 1023, yMinCfg: 0, yMaxCfg: 1023,
    }, clone(shifterGearDefaults));
    capturedGears.clear();
    renderSettings();
    markDirty();
  });
  $$('[data-capture-pedal]').forEach((button) => {
    button.addEventListener('click', () => capturePedalEndpoint(button));
  });
  [$('#settingsDialog'), $('#connectDialog')].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
})();
