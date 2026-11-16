# Firmware Malth Pro — Leonardo 0.2.0

Alvo: **Arduino Leonardo, ATmega32U4, 16 MHz / 5 V**. Este pacote tem codigo-fonte
proprio e uma biblioteca USB aberta para comunicacao HID e Force Feedback.
Use com **Malth Pro para Windows 1.4.0**. FFB independente do aplicativo: veja `docs/UPDATE_1.4.0.md`. O protocolo de comandos 2 usa agora o transporte HID.
Esta imagem inclui telemetria dos 16 botoes da matriz e limite de 1080 graus;
grave o novo HEX para utilizar as duas alteracoes tambem no Arduino.
Na placa, o jogo controla o FFB pelo USB PID, sem depender do aplicativo.
A posicao ao iniciar o Arduino define o centro inicial; Centralizar o redefine.

## Arquivos para usar

- `releases/Malth Pro-v0.2.0.hex` (anterior: `Malth Pro-v0.1.13.hex`): imagem para carregar pelo bootloader
  Caterina do Leonardo, sem incluir ou substituir o bootloader.
- `Leonardo/MalthProLeonardo/`: codigo Arduino completo (`.ino`, `.cpp`, `.h`).
- `libraries/JoystickFFB/`: biblioteca USB/HID com alteracoes locais e licenca.
- `build-firmware.ps1`: prepara o compilador local e recompila a imagem.
- `upload-leonardo.ps1 -Port COM5`: exemplo de gravacao usando a porta atual do
  Leonardo. Execute apos preparar as ferramentas com o script de compilacao.

Se ja usa um carregador de HEX para Leonardo, selecione o HEX acima e a placa
ATmega32U4/Leonardo. **Nao use a imagem `with_bootloader` para upload USB.**
Feche o Malth Pro e o Monitor Serial antes de gravar. A gravação no Arduino
da versão 0.1.5 foi concluída e verificada nesta bancada. A versão 0.1.7
ainda não foi gravada: o Arduino estava desconectado ao prepará-la.

## Revisão0.1.12

Assentamento da ponte atendido por Timer1overflow apenas durante comutação;
74testesAVR laço livre/ocupado,93PWM,82efeitos e142controle aprovados.
Gravado/verificado28296bytes com EEPROM idêntica. Leitura11tipos e250Hz na
placa com fonteOFF aprovada. Usuário confirmou retorno e terreno no ETS2;
leitura180s sem reinício/rejeição. ATS/estabilidade prolongada ainda pendentes.
Veja docs/UPDATE_1.3.6.md e docs/FFB_CONTROL_AUDIT.md.

## Revisão0.1.10

Converte origem da força DirectInput em movimento aplicado do motor. Condições
e batentes conservam seu cálculo restaurador.82 verificações efeitos e142
controle/PID AVR aprovadas. Imagem gravada/verificada; polaridade na placa conferida sem potência. Teste energizado no jogo ainda pendente.
Veja docs/UPDATE_1.3.5.md; causa de reinício USB sob potência não comprovada.

## Revisão0.1.9

Reset agora habilita atuadores e limpa pausa/efeitos conforme USB PID5.13.
0.1.9 gravado/verificado com fonte12V desligada; EEPROM preservada.
Disable/Reset conferidos na placa sem efeitos de força. Novo teste ETS2/ATS
ainda pendente. Compatível também com aplicativo1.3.2. Ver docs/UPDATE_1.3.3.md.

## Revisão0.1.8

Efeitos/envelopes e pausa revisados; freio com curva e Hall crescente/decrescente.
Mínimo captura pedal solto e Máximo captura pressionado, mesmo se a leitura cair.
O novo HEX ainda não foi gravado/testado na bancada. Ver docs/UPDATE_1.3.2.md.

## Pinagem confirmada

| Sinal | Pino Leonardo |
| --- | --- |
| Encoder A / B | D0 / D1 |
| Acelerador / freio | A0 / A1 |
| Embreagem / freio de mao | A2 / A3 |
| Cambio X / Y | A4 / A5 |
| BTS7960 R_EN + L_EN, juntos | D8 |
| BTS7960 LPWM / RPWM | D9 / D10 |
| Matriz 4x4, colunas | D12, D7, D6, D5 |
| Matriz 4x4, linhas | D4, D14, D15, D16 |

D14/D15/D16 sao os pinos do conector ICSP do Leonardo. A matriz esta habilitada e
os pinos de entrada usam pull-up, podendo ficar sem botoes conectados. Uma matriz
sem diodos pode apresentar teclas fantasmas quando varias teclas sao pressionadas.
O sinal Z do encoder nao esta conectado neste esquema.

## Primeiro uso

1. Com a alimentacao de potencia do motor desligada, grave o HEX e instale o
   Malth Pro 1.3.2. Mantenha o USB para testar as entradas.
2. Abra o aplicativo: o Leonardo e identificado e conectado automaticamente.
   O ultimo perfil selecionado e aplicado. **VOLANTE** mostra o diagnostico.
3. Na aba **Configuracoes**, confira o **CPR**, que e o numero de contagens por volta apos
   decodificacao x4. Exemplo: encoder de 1000 pulsos/volta -> CPR 4000.
4. Salve o perfil. Os botoes Minimo/Maximo capturam os valores brutos de cada pedal;
   o firmware aplica esses limites no controle reconhecido pelos jogos.
5. No cambio, ajuste X inferior/central/superior para separar as quatro colunas e Y inferior/superior
   para deixar a faixa central como neutro. Calibre cada marcha no respectivo
   quadrado. Cada zona deve conter apenas uma marcha; zonas ambiguas ficam em N.
   No sequencial, apenas Y e usado; botoes de subida/descida ficam ativos enquanto
   a alavanca permanece acionada.
6. A posicao atual define o centro ao conectar; para corrigir a referencia,
   deixe o volante reto e clique em **Centralizar**. O aplicativo redefine o
   centro e retoma o FFB. A posicao absoluta nao e salva, pois o encoder e
   incremental e nao ha sinal Z ligado.
7. Para validar o motor, configure Forca minima em zero, Forca maxima baixa e
   **Efeito fora do jogo > Mola** com intensidade baixa. Clique em Salvar e
   mantenha acesso ao corte da alimentacao de potencia. A forca ja estara
   habilitada ao ligar essa alimentacao; comece sem as maos no volante.
   A magnitude segue os limites escolhidos no perfil (0–100%), sem teto adicional de bancada.
   Confirme que a forca de mola/batente se opoe ao deslocamento. Se ela empurrar
   no mesmo sentido, corte a potencia; o sentido fisico do motor/encoder ainda
   precisa ser corrigido antes de continuar.
8. A partir da 0.2.0 o FFB nao depende do aplicativo: fechar o app nao desliga o
   motor. Retirar o USB desliga; o jogo desliga pelo Disable Actuators; forcas ativas
   de um jogo travado somem em ate 2 segundos. Mantenha o corte fisico da potencia.

Abrir ou reconectar o aplicativo preserva o centro e o perfil da placa.
Trocar explicitamente de perfil aplica seus valores; Salvar tambem grava na EEPROM.
O aplicativo nao envia ARM automaticamente no modo autonomo e respeita Disable do jogo.
Para jogos com FFB, deixe Efeito fora do jogo em Desligado e salve. Para jogos
sem FFB, use Mola para o retorno ao centro; esse efeito e calculado no Arduino
e nao depende de efeitos enviados pelo jogo.
Os parametros ficam na EEPROM, em dois registros com CRC e marcador final para
recuperacao de uma gravacao interrompida. A placa carrega o perfil persistido ao
iniciar; somente **Salvar** solicita nova gravacao persistente na EEPROM.

## Controle apresentado aos jogos

Sete eixos de 16 bits: X=volante, Y=acelerador, Z=freio, Rx=embreagem,
Ry=freio de mao, Rz=cambio X, Slider=cambio Y. A resolucao fisica dos seis
canais analogicos e de 10 bits (0..1023).

32 botoes: 1..16=matriz, 17..24=1a..7a/Re, 25=sequencial para cima,
26=sequencial para baixo; 27..32 reservados. O cambio H libera todos os botoes de
marcha no neutro. O modo sequencial nao gera botoes H. O Windows/jogo pode
mostrar nomes diferentes para os eixos; mapeie-os na configuracao do jogo.

## Recursos implementados no codigo

- HID de entrada, endpoint de saida PID e Get/Set Feature Reports para criacao
  e alocacao de efeitos; GET_REPORT de entradas e estado PID.
- Seis efeitos simultaneos: constante, rampa, quadrada, seno, triangular,
  dente de serra, mola, amortecimento, atrito e inercia (tipos disponiveis).
  Custom Force por amostras nao e anunciado nem implementado.
- Angulo de 30 a 1080 graus; PWM de 4 a 20 kHz no Timer1.
- Matriz 4x4 habilitada no HID e na telemetria HID, campo `buttons` de 16 bits.
- BTS7960 no modo 2 PWM + habilitacao comum, rotulado 2PWM + 1DIR na interface.
  Alternativa 1PWM + 1DIR adaptada aos mesmos fios: D9 PWM, D10 direcao e D8
  habilitacao comum. D8 nao muda de funcao. Veja `docs/PWM_BTS7960.md` na raiz.
- Linearidade de freio em dez pontos ajustaveis, origem fixa, com interpolacao;
  entradas do tipo Hall ou celula de carga precisam fornecer sinal analogico
  adequado a A1. Este codigo nao inclui interface digital HX711.
- Hardlock, softlock, ganho dos efeitos e filtros de amortecimento/atrito/inercia.
- Receptor PID em interrupcao de 1 ms; entradas e calculo de torque com periodo
  alvo de 2 ms; envio HID sem esperar por espaco do host. Isso reduz caminhos
  que poderiam bloquear, mas nao comprova latencia fim a fim nem ausencia de
  travamentos em todos os jogos. `overruns` na telemetria conta ciclos >5 ms.
- Motor desligado na inicializacao do firmware; o aplicativo aplica o
  perfil, define o centro inicial e habilita a forca. Permanecem o
  desarme por falta de laco de controle e watchdog do microcontrolador.

Os modos com 2 DIR **nao estao habilitados** para esta pinagem fixa. O encoder
usa A/B e a opcao Indice Z foi retirada da interface. Suporta apenas o Leonardo de 16 MHz desta
entrega; nao grave esta imagem num Pro Micro de 8 MHz.

## Validacao e reproducao

Compilado com Arduino CLI 1.5.1, Arduino AVR Boards 1.8.8, avr-gcc
7.3.0-atmel3.6.1-arduino7. Resultado: 26572/28672 bytes de flash e 1790/2560
bytes de variaveis globais na imagem 0.1.0, antes da alocacao do descritor HID e
da pilha. A imagem 0.1.2 usa 27014/28672 bytes de programa e 1830/2560 bytes
globais de SRAM, tambem antes das alocacoes dinamicas e da pilha.

Foram aprovados seis testes de comunicacao no PC, 12 verificacoes da interface
Electron em janela oculta e 46 verificacoes de
calibracao/relatorios PID executadas como instrucoes AVR no avr8js 0.21.1.
Esses resultados sao historicos da imagem 0.1.0. Na 0.1.2 foram executadas
78 verificacoes de calculos PWM em instrucoes AVR e quatro testes do protocolo
PWM no PC, todos sem falhas. As demais suites nao foram reexecutadas.
Esses testes nao simulam USB fisico, temporizacao de interrupcoes, ADC, EEPROM,
encoder ou BTS7960. Faltam os testes no seu Leonardo e nos jogos.

Biblioteca baseada em YukMingLaw/ArduinoJoystickWithFFBLibrary, commit
`ed86e27e63f53214dbdee68f9977657e85ad4f7b`, com autores/licencas preservados.
As alteracoes locais estao descritas em `THIRD_PARTY.md`. O codigo-fonte
distribuido corresponde a imagem HEX; pode ser recompilado e modificado.


## Revisão 0.1.3 — 31/10/2026

Removido teto fixo de 25%. MIN_FORCE/MAX_FORCE seguem exclusivamente o perfil.
Sem piso obrigatório: mínimo 0 preserva a magnitude solicitada; força zero permanece
desligada. Perfis e EEPROM anteriores são preservados, sem trocar valores salvos.
Novas configurações sem dados anteriores usam mínimo 0 e faixa máxima 100.
93 verificações de cálculos PWM em emulação AVR passaram, incluindo os dois
modos, polaridades e saída de 0 a 100%. Isso não valida a eletrônica ou o motor.
Imagem compilada com 26.992 bytes de programa. Nenhuma gravação na placa nesta rodada.

## Revisão 0.1.4 — 02/11/2026

Batentes não antecipam o ângulo: 900° totais = ±450°, 1080° = ±540°.
A antiga atuação suave a 90% começava em ±405°/±486°, respectivamente.
Agora os batentes suave e rígido atuam progressivamente somente além do limite;
seus ganhos seguem o perfil, sem queda de resistência ao atravessar a fronteira.
Efeitos do jogo/mola/amortecimento continuam podendo agir dentro do curso.
Limite arredondado para fora à resolução do encoder; desvio inferior a uma
contagem quando o CPR/ângulo não representam uma contagem inteira.
Correção de multiplicação com sinal no batente rígido para CPR/ângulos altos.
EEPROM, protocolo2, pinagem e força mínima/máxima preservados.
108 verificações de controle/batentes e 93 de PWM em AVR aprovadas.
HEX válido com 26.792 bytes de programa, sem bootloader. Não gravado no Arduino
pelo agente; limites físicos e força real ainda não ensaiados nesta revisão.


## Revisão 0.1.5 — 02/11/2026

Configuração e heartbeat passam da CDC/COM para Feature Reports HID próprios:
coleção Vendor 0xFF00/usage1, report0x40, 64bytes (ID, tamanho, até62dados).
O jogo conserva a coleção do volante e relatórios PID; identidade USB preservada.
Comandos são recebidos em buffer limitado na ISR e processados no laço principal;
respostas/telemetria são lidas em fragmentos, sem Serial.write no controle.
Mantidos perfil, EEPROM, batentes, watchdog e pinagem. O aplicativo 1.3.0 é
necessário; o antigo não configura este firmware por COM.
O toque1200baud do bootloader é respeitado: o controle deixa de alimentar o
watchdog quando o core solicita o reset de upload. Na primeira atualização do
firmware anterior pode ser necessário apertar RESET fisicamente.
124 verificações de controle/HID e93 de PWM em AVR e22 testes Node aprovados.
Imagem27184bytes gravada e verificada no Leonardo com fonte de potência desligada.
Primeiro teste real: 466 estados HID em15,493segundos, sem falhas, armado0, overruns0.
Isso ainda não é validação sob torque.


##0.1.13 — prévia sequencial com ré

Contador local permiteR↔N↔1…7. BotõesUSB25/26(sobe/desce) continuam
genéricos e são enviados mesmo nos extremos do contador. O jogo determina
a marcha real; não há telemetria de retorno. Sem mudança deFFB/pinagem/EEPROM.
Compilado para entrega; não gravado nesta atualização.
