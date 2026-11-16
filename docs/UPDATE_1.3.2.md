# Malth Pro 1.3.2 / firmware 0.1.8

Revisão dos efeitos FFB e da curva do freio, usando os repositórios indicados
pelo usuário como referência. Pinagem EMC da montagem preservada: D8 habilita
R_EN/L_EN juntos; D9/D10 são PWM; encoder D0/D1. Pedais, câmbio e matriz intactos.

## Force Feedback

- Cálculo de cada efeito extraído para EffectMath.h, usado pelo controle real
  e pelos testes AVR. Constant Force mantém sinal e magnitude do único atuador.
- Envelope aplicado à amplitude dos efeitos periódicos, preservando o offset;
  antes o envelope também multiplicava esse deslocamento fixo.
- Rampa recebe envelope; antes a magnitude da rampa não alimentava esse cálculo.
  Centro e amplitude da rampa seguem a decomposição usada no AFFBWheel.
- Pausa congela o tempo dos efeitos; retomar não consome a duração durante a
  pausa. Reset limpa pausa/habilitação e restaura ganho global padrão.
- Início atrasado declarado no HID e recebido no Set Effect: dois bytes
  acrescentados depois dos offsets já existentes. Duração, repetição e virada
  do relógio uint32 verificadas; pacote Set Effect anterior ainda é aceito.
- Seno passa a usar interpolação inteira de tabela, sem sin() flutuante no laço.
  Período mínimo4ms compatível com controle500Hz, comparado à referência ranenbg.
- Mola/amortecimento/atrito locais, rotulados fora do jogo, não são somados
  enquanto há efeito de jogo ativo. Batentes continuam independentes do jogo.
- Velocidade/aceleração limitadas antes da multiplicação, evitando overflow
  com uma variação grande do encoder. Filtros, ganhos e mínimo/máximo do perfil
  continuam sob controle do usuário. Sem teto fixo de bancada.
- Estado de condições reduzido ao único atuador físico X, economizando SRAM;
  entradas de pedais continuam independentes e não viram motores de FFB.

## Freio e Hall49E

- Calibração aceita leitura crescente ou decrescente. Mínimo corresponde ao
  pedal solto e Máximo ao pressionado, mesmo quando o número do sensor diminui.
  Os dois endpoints devem resultar em contagens ADC diferentes.
- Firmware e aplicativo usam o mesmo caminho: calibração/clipping0..1023,
  interpolação dos dez pontos e saída ao jogo. A barra antes mostrava somente
  a entrada calibrada, ignorando a curva aplicada pelo firmware.
- Painel de linearidade mostra Bruto, Calibrado e Convertido ao vivo, com ponto
  móvel no gráfico. Origem fixa em zero; sliders/setas mantêm a curva crescente.
- Fallback Gamepad Malth já convertido não recebe curva/calibração duas vezes;
  só telemetria bruta permite capturar endpoints. Outro controle conectado não
  é escolhido automaticamente como se fosse o pedal do Malth.
- Exemplo verificado: Hall solto800/pressionado300, leitura550 resulta em511
  calibrado; curva quadrática de referência produz255, isto é,25% de saída.

## Aparência

Modelo Fórmula1 incluído com o PNG baixado pelo usuário, sem alteração de seus
bytes. Seleção: Padrão, Scania, Fórmula1 e PNG externo. Persistência e retorno
ao arquivo externo preservados; trocar imagem não envia comandos ao motor.

## Reaproveitamento e referências

EffectMath.h adapta a organização de envelope/magnitude do AFFBWheel e preserva
o aviso permissivo/autores do arquivo FfbEngine.cpp. Tabela de seno foi gerada
matematicamente para este firmware. Não foi copiado o módulo trig_fixed externo.
Ranenbg serviu para conferir ciclo, efeitos, HID e saída; GUI para comparar
perfis/telemetria. Protocolos e pinagens desses projetos não foram transplantados.
Ver FFB_REFERENCE_REVIEW.md e firmware/THIRD_PARTY.md.

WheelConfig.zip fornecido: SHA256
e810af3e1b694b697c5730f960e99f479615a51e701bebb7a0b50242a625ccb9.
REA inventariou o ZIP e identificou WheelConfig.exe como PE x86 nativo. Ghidra
identificou962 funções e exportou pseudocódigo de961, com avisos em alguns
fluxos. Recursos contêm Linearity Editor e Force table; isso não recupera nem
certifica a fórmula aplicada a todos os controles. Readme/licença trazem nomes
de outros produtos e um texto CC BY-NC-SA; não foi presumida autorização ampla
para copiar código/recursos desse pacote. Usado somente como referência estática.
Nenhum executável ou driver do ZIP foi instalado/executado.

## Quatro modos da ponte H

Usuário confirmou novamente ambos os EN no D8. Trechos do HEX EMC0932 foram
executados no emulador AVR, nos dois sentidos, com OCR/PORTB monitorados:
modos nativos2/4 usam D11 separadamente de D8; um sentido leva D8 a zero.
Com os EN unidos isso desabilita a ponte, portanto manter o menu com quatro
entradas habilitadas não torna os quatro modos eletricamente compatíveis.
Os dois modos Malth adaptados a D8/D9/D10 foram mantidos; modos2DIR continuam
indisponíveis nessa ligação. Não foram criadas opções que só trocam o rótulo.
Emulação não mede formas de onda elétricas e não substitui ensaio de bancada.

## Validação

25 testes Node,142 verificações controle/PID AVR,63 verificações específicas de
efeitos/freio AVR e93 verificações PWM aprovadas. Testes Electron sem hardware
conferiram captura Hall decrescente, curva enviada, prévia, modelos de volante,
persistência, perfil automático e ausência de comandos por troca de aparência.

HEX compilado:27736/28672 bytes de programa;1848/2560 bytes globais de SRAM,
sem contar pilha.

O Arduino estava desconectado segundo o último estado informado. Não houve
gravação0.1.8, ensaio de torque, teste real dos pedais ou nova execução ETS2.
Use aplicativo1.3.2 e HEX0.1.8 juntos para as mudanças de curva/polaridade e HID.
Na calibração, capture Mínimo com pedal solto e Máximo totalmente pressionado;
ajuste a curva e salve. Deixe o efeito local desligado ao validar FFB do jogo.
Desempenho e sentido restaurador físicos, recepção dos relatórios no ETS2 e
estabilidade sob carga continuam exigindo validação com a montagem real.
