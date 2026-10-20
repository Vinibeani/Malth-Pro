# Firmware Malth Pro — Leonardo 0.1.2 (bancada)

Alvo: **Arduino Leonardo, ATmega32U4, 16 MHz / 5 V**. Este pacote tem codigo-fonte
proprio e uma biblioteca USB aberta para comunicacao HID e Force Feedback.
Use com **Malth Pro para Windows 1.2.5**. O protocolo serial 2 foi mantido.
Esta imagem inclui telemetria dos 16 botoes da matriz e limite de 1080 graus;
grave o novo HEX para utilizar as duas alteracoes tambem no Arduino.
No aplicativo, a forca e habilitada automaticamente apos aplicar o perfil;
a posicao ao conectar define o centro inicial. Deixe o volante reto ao conectar.

## Arquivos para usar

- `releases/Malth Pro-v0.1.2.hex`: imagem para carregar pelo bootloader
  Caterina do Leonardo, sem incluir ou substituir o bootloader.
- `Leonardo/MalthProLeonardo/`: codigo Arduino completo (`.ino`, `.cpp`, `.h`).
- `libraries/JoystickFFB/`: biblioteca USB/HID com alteracoes locais e licenca.
- `build-firmware.ps1`: prepara o compilador local e recompila a imagem.
- `upload-leonardo.ps1 -Port COM5`: exemplo de gravacao usando a porta atual do
  Leonardo. Execute apos preparar as ferramentas com o script de compilacao.

Se ja usa um carregador de HEX para Leonardo, selecione o HEX acima e a placa
ATmega32U4/Leonardo. **Nao use a imagem `with_bootloader` para upload USB.**
Feche o Malth Pro e o Monitor Serial antes de gravar. Nenhuma gravacao no Arduino
foi feita durante a criacao deste pacote.

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
   Malth Pro 1.2.5. Mantenha o USB para testar as entradas.
2. Clique em **VOLANTE** e escolha a porta COM do Leonardo. A conexao so e
   confirmada apos identificar o firmware Malth Pro. O aplicativo lembra a
   identidade escolhida e tenta reconectar nas proximas vezes.
3. Na engrenagem, confira o **CPR**, que e o numero de contagens por volta apos
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
   A imagem de bancada limita o PWM a **25%**, mesmo se o perfil pedir mais.
   Confirme que a forca de mola/batente se opoe ao deslocamento. Se ela empurrar
   no mesmo sentido, pressione Esc e corte a potencia; o sentido fisico do motor/encoder ainda
   precisa ser corrigido antes de continuar.
8. **Esc** desativa o FFB. Fechar/desconectar o aplicativo tambem desarma o motor;
   a perda das confirmacoes de vida o desarma em ate 2 segundos. O aplicativo
   deve permanecer aberto para manter o FFB habilitado nesta versao.

O aplicativo retoma o FFB automaticamente apos salvar uma
configuracao. Depois de Esc, essa retomada fica suspensa: use Centralizar
para retomar explicitamente. Reconectar automaticamente na mesma sessao
tambem respeita essa interrupcao. Reabrir o aplicativo inicia uma nova sessao.
Para jogos com FFB, deixe Efeito fora do jogo em Desligado e salve. Para jogos
sem FFB, use Mola para o retorno ao centro; esse efeito e calculado no Arduino
e nao depende de efeitos enviados pelo jogo.
Os parametros ficam na EEPROM, em dois registros com CRC e marcador final para
recuperacao de uma gravacao interrompida. O aplicativo aplica o perfil ativo em
RAM ao conectar; somente **Salvar** solicita a gravacao persistente na EEPROM.

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
- Matriz 4x4 habilitada no HID e na telemetria serial, campo `buttons` de 16 bits.
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
  perfil, define o centro inicial e habilita a forca. Limite de bancada,
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
