# Malth Pro 1.2.8 / Leonardo 0.1.3 — força definida pelo usuário

31/10/2026.

- Removido o teto fixo de bancada de 25% do firmware. A saída segue
  exclusivamente Força mínima e Força máxima escolhidas pelo usuário (0–100%).
- Não existe piso obrigatório de compensação: mínimo 0 preserva a magnitude
  solicitada pelo jogo, com comando zero mantendo saída desligada.
- Removidos padrão de compensação mínima 5% e padrão de teto 25% do firmware
  e do protocolo. Sem dados salvos, faixa inicial 0–100%. Isso não altera
  configurações já salvas em perfis ou na EEPROM.
- Presets FFB continuam opcionais para ganhos/batentes. Não mudam a força mínima
  nem a máxima. Removidas as imposições de mínima 0 e máxima min(nível,25).
- Comunicação, USB, watchdogs e habilitação após identificação/perfil/centro
  continuam funcionando. Aplicativo mantém conexão automática e perfis da 1.2.7.
- Para remover o teto na placa é necessário gravar Malth Pro-v0.1.3.hex.
  Apenas instalar o aplicativo não muda um firmware 0.1.2 já gravado.

Validação: HEX compilado e checksums/endereço de aplicação conferidos;
93 verificações de cálculos PWM em instruções AVR, sem falhas, incluindo
0/50/100%, os dois modos BTS e limites definidos pelo perfil. 14 testes de
conexão/protocolo/PWM no PC aprovados. Testes Electron usam comunicação simulada.
Sem gravação no Arduino, instalação no PC ou acionamento do motor nesta rodada.
