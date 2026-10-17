# Estado do Malth Pro

Atualizado em 17/10/2026.

## Versoes

- Aplicativo Windows: 1.2.3, com janela 1080 x 620.
- Firmware de bancada: Leonardo 0.1.0, protocolo serial 2.
- Interface localizada em `malth-control/`.

## Implementado

- Volante com encoder incremental e angulo de 30 a 2160 graus.
- Calibracao Minimo/Maximo dos pedais e curva de freio de dez pontos.
- Cambio H-Shifter ou sequencial, com mapa e leitura ao vivo.
- Perfis locais, importacao/exportacao JSON e gravacao confirmada na EEPROM.
- Receptor USB HID PID para efeitos de Force Feedback.
- Saida BTS7960 em D8/D9/D10, modo padrao 2 PWM + 1 DIR.
- Habilitacao automatica do FFB apos conectar e aplicar o perfil; posicao inicial
  usada como centro. Centralizar corrige a referencia e retoma a forca.
- Esc interrompe a forca; gravacoes e reconexoes na mesma sessao respeitam essa
  interrupcao ate uma nova centralizacao.
- Reconexao limitada ao dispositivo escolhido e identificado anteriormente.
- Limite de bancada de 25%, watchdogs e desarme por perda de comunicacao.

## Hardware

Arduino Leonardo, ATmega32U4, 16 MHz / 5 V; BTS7960 e um motor DC.
Encoder A/B em D0/D1, pedais em A0..A3 e cambio em A4/A5.
O indice Z nao esta ligado. A matriz de botoes 4x4 permanece prevista no firmware.

## Validacao

O usuario confirmou conexao com o Leonardo e leitura dos pedais/cambio.
Testes anteriores de comunicacao, interface e calculos em emulacao AVR foram
realizados. A resposta fisica do motor, sentido/ganho, latencia e estabilidade
nos jogos ainda aguardam validacao. As alteracoes de organizacao dos fontes
nao foram submetidas a uma nova rodada de testes automatizados.

## Organizacao para backup

Os caminhos dos scripts sao relativos ao projeto ou usam locais padrao do
sistema. O pacote de codigo-fonte inclui README, imagem, interface, aplicativo,
firmware, scripts e avisos das bibliotecas utilizadas. Dependencias instaladas,
compiladores e saidas de compilacao sao gerados localmente.
