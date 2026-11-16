# Dependencias e alteracoes

## JoystickWithFFB

- Origem: https://github.com/YukMingLaw/ArduinoJoystickWithFFBLibrary
- Commit: ed86e27e63f53214dbdee68f9977657e85ad4f7b
- Copia-fonte incluida em `libraries/JoystickFFB`.
- Licenca LGPL-3.0 incluida no diretorio da biblioteca. Os avisos dos autores
  originais nos arquivos tambem foram preservados. Componentes PID possuem os
  avisos MIT dos autores anteriores.
- Os arquivos proprios em `Leonardo/MalthProLeonardo` sao distribuidos sob
  LGPL-3.0-or-later, com o codigo-fonte para recompilacao/religacao.

Modificacoes locais: seis blocos de efeitos para reservar SRAM; limites e
comprimentos dos relatórios verificados antes de acesso; correcao da alocacao
do ultimo bloco e da contabilidade do pool; contador de repeticoes separado da
duracao; indices de eixos de condicao conferidos; GET_REPORT para entrada/estado
e Feature Reports; SET_REPORT de saida pelo endpoint de controle; GET_IDLE e
GET_PROTOCOL respondidos; remocao da espera artificial no Feature Report;
envio HID sem espera quando o endpoint esta cheio; setimo eixo exposto como
Slider; Custom Force removido da lista de tipos de efeitos anunciados.
Na 0.1.5 foi acrescentada coleção Vendor HID Feature0x40 com buffers limitados
para a configuração própria do Malth Pro; descritores PID e identidade preservados.
Na 0.1.7, Axes Enable declara somente a junta física X, preservando o layout
de bytes do Set Effect. Feature0x41 acrescenta contadores de diagnóstico PID.

O motor usa o calculo proprio em `Controller.cpp`; nao utiliza `getForce()`
nem as funcoes de calculo de torque da biblioteca original. A biblioteca fornece
a enumeracao HID, os relatórios PID e o estado dos efeitos.

## Referência de envelopes AFFBWheel — firmware0.1.8

`Leonardo/MalthProLeonardo/EffectMath.h` adapta o cálculo escalar/envelopes
do arquivo FfbEngine.cpp de vsulako/AFFBWheel, commit
706e188f969f2af39efb148a60e5a8393ba46711. Aviso completo e autores preservados
no cabeçalho desse arquivo. Projeto MIT e arquivo com permissão própria.
https://github.com/vsulako/AFFBWheel/blob/706e188f969f2af39efb148a60e5a8393ba46711/AFFBWheel/FfbEngine.cpp

Arduino-FFB-wheel e Arduino-FFB-gui de ranenbg usados como referências de
protocolo/ciclo/telemetria; não houve cópia de bibliotecas, drivers, executáveis
ou interface desses projetos. WheelConfig foi inspecionado estaticamente, sem
incorporar código ou recursos do pacote. Ver docs/FFB_REFERENCE_REVIEW.md.

## Compilacao

Arduino AVR Boards 1.8.8 e toolchain oficial baixados pelo Arduino CLI. Fontes,
avisos e licencas ficam em `tooling/data/packages/arduino/` apos preparar as
ferramentas. Downloads oficiais sao usados e as ferramentas ficam locais ao
projeto, sem instalacao global.

## Emulacao de testes

avr8js 0.21.1: https://github.com/wokwi/avr8js, licenca MIT. Usado apenas para
testes de instrucoes/calculos AVR, sem ser incluido no firmware do dispositivo.
