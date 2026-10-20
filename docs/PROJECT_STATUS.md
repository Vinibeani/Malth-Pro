# Estado do Malth Pro

Atualizado em 20/10/2026.

## Versoes

- Aplicativo Windows: 1.2.5, com janela 1080 x 620.
- Firmware de bancada: Leonardo 0.1.2, protocolo serial 2.
- Interface localizada em `malth-control/`.

## Implementado

- Volante com encoder incremental e angulo de 30 a 1080 graus.
- Calibracao Minimo/Maximo dos pedais e curva de freio de dez pontos.
- Cambio H-Shifter ou sequencial, com mapa e leitura ao vivo.
- Matriz 4x4 habilitada no firmware, acessivel em Cambio > Modo > Botoes,
  com 16 indicadores compactos ao vivo, sem aba separada.
  O firmware 0.1.2 transmite os botoes na telemetria USB serial; o HID conserva
  o mapeamento dos botoes 1..16 para os jogos.
- Perfis locais, importacao/exportacao JSON e gravacao confirmada na EEPROM.
- Receptor USB HID PID para efeitos de Force Feedback.
- Saida BTS7960 em D8/D9/D10, modo padrao 2 PWM + 1 DIR.
- Alternativa 1 PWM + 1 DIR adaptada aos mesmos fios; modelo BTS fixo,
  modos com 2 DIR indisponiveis por exigirem outra ligacao. Indice Z removido da interface.
- Habilitacao automatica do FFB apos conectar e aplicar o perfil; posicao inicial
  usada como centro. Centralizar corrige a referencia e retoma a forca.
- Esc interrompe a forca; gravacoes e reconexoes na mesma sessao respeitam essa
  interrupcao ate uma nova centralizacao.
- Reconexao limitada ao dispositivo escolhido e identificado anteriormente.
- Limite de bancada de 25%, watchdogs e desarme por perda de comunicacao.
- A imagem usa a direcao ja invertida pelo firmware, sem inverter novamente.
- Alterar CPR ou inversao invalida o centro tambem na sessao do aplicativo;
  a centralizacao e confirmada antes de retomar a forca. Esc continua impedindo
  a retomada automatica ate uma centralizacao solicitada pelo usuario.
- O envio usa uma copia do perfil; falhas de confirmacao invalidam o estado
  local de centralizacao antes de uma nova tentativa.

## Hardware

Arduino Leonardo, ATmega32U4, 16 MHz / 5 V; BTS7960 e um motor DC.
Encoder A/B em D0/D1, pedais em A0..A3 e cambio em A4/A5.
O indice Z nao esta ligado. A matriz de botoes 4x4 permanece prevista no firmware.

## Validacao

O usuario confirmou conexao com o Leonardo e leitura dos pedais/cambio.
Testes anteriores de comunicacao, interface e calculos em emulacao AVR foram
realizados. A resposta fisica do motor, sentido/ganho, latencia e estabilidade
nos jogos ainda aguardam validacao. Nesta atualizacao, 78 verificacoes dos
calculos PWM em AVR e quatro testes do protocolo PWM no PC passaram sem falhas.
As demais suites nao foram reexecutadas. O roteiro de bancada esta em
`docs/UPDATE_1.2.5.md` e `docs/PWM_BTS7960.md`.

## Organizacao para backup

Os caminhos dos scripts sao relativos ao projeto ou usam locais padrao do
sistema. O pacote de codigo-fonte inclui README, imagem, interface, aplicativo,
firmware, scripts e avisos das bibliotecas utilizadas. Dependencias instaladas,
compiladores e saidas de compilacao sao gerados localmente.
