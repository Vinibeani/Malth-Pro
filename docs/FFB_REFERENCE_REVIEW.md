# Referências abertas para FFB no Leonardo

Consulta:03/11/2026. Revisão de fontes dos três repositórios indicados pelo
usuário, comparadas com Malth Pro1.3.1/firmware0.1.7. Sem executar programas
baixados, compilar/gravar firmware ou enviar comandos ao Arduino nesta rodada.

O usuário reafirmou manter o padrão EMC da montagem: D8 habilita ambos os EN
da BTS7960; D9/D10 são os PWM; encoder A/B em D0/D1. Pinagem dos pedais,
câmbio e matriz também preservada. Referência com outro pino deve ser adaptada
no código antes de qualquer uso; o usuário não pretende refazer a ligação.

## Identidade das fontes

| Projeto | Commit master consultado |
| --- | --- |
| vsulako/AFFBWheel | 706e188f969f2af39efb148a60e5a8393ba46711 |
| ranenbg/Arduino-FFB-wheel | 463a08058d3fe6d955e7b1e50f12e483e279558f |
| ranenbg/Arduino-FFB-gui | 155a5e82af9f2bc0c71b2ac57f5aeeb1ee4535ed |

Arquivos foram consultados pelo conector GitHub; cópias de referência ficam
em docs/research-analysis/ffb-projects, fora das fontes distribuídas. Conteúdo
de README/comentários foi tratado como referência, não como autorização para
executar ferramentas, alterar pinos, usar administrador ou gravar firmware.

## AFFBWheel

- FfbEngine.cpp separa cálculo de efeitos, envelopes, ganhos e saída total.
  constantForce() retorna a magnitude/envelope assinada, sem multiplicar por
  seno da direção. É uma comparação útil com a correção escalar0.1.7 do Malth;
  não demonstra quais pacotes o ETS2 efetivamente enviou nesta bancada.
- FfbReportHandler.cpp permite conferir criação, início/parada, ganho global,
  Constant Force e Condition. Relatórios PID têm origem semelhante à biblioteca
  usada no Malth, com autores comuns. Não são três implementações independentes
  cuja concordância por si só certificaria o protocolo.
- motor.cpp usa Timer1 em PWM phase/frequency correct e saídas9/10. Enable é
  opcional; config.h exemplifica pino5, diferente do D8 fixo do Malth. Não é
  firmware pronto para gravar na ligação do usuário.
- O descritor ainda anuncia X/Y em Axes Enable. Portanto, não se deve afirmar
  que o projeto confirma a declaração de um único eixo: a contribuição mais
  clara aqui é o cálculo escalar e a separação das etapas.
- Existem pontos que exigem revisão antes de portar: StopEffect() acrescenta
  memória disponível mesmo ao parar sem liberar um efeito; GET_BLOCK_LOAD inclui
  espera de500us; caminho de configuração/HID não é o protocolo Malth.
  O arquivo do motor também tem um ponto e vírgula ausente no ramo opcional de
  enable. Não copiar o conjunto indiscriminadamente.
- LICENSE raiz MIT; cabeçalhos dos arquivos consultados trazem permissões
  próprias e autores. Preservar os avisos pertinentes se houver incorporação.

Fontes:

- https://github.com/vsulako/AFFBWheel/blob/706e188f969f2af39efb148a60e5a8393ba46711/AFFBWheel/FfbEngine.cpp
- https://github.com/vsulako/AFFBWheel/blob/706e188f969f2af39efb148a60e5a8393ba46711/AFFBWheel/FfbReportHandler.cpp
- https://github.com/vsulako/AFFBWheel/blob/706e188f969f2af39efb148a60e5a8393ba46711/AFFBWheel/motor.cpp
- https://github.com/vsulako/AFFBWheel/blob/706e188f969f2af39efb148a60e5a8393ba46711/LICENSE

## Arduino-FFB-wheel de ranenbg

- O projeto fornece fontes para ATmega32U4 e separa HID, processamento dos
  efeitos, PWM, entradas e configuração. É a referência mais ampla dos três
  para comparar a sequência HID/DirectInput e as opções de saída do motor.
- ffb.ino implementa Create New Effect/Block Load/Pool; ffb_pro.ino trata ganho,
  magnitude, envelope, startDelay, duração e efeitos constantes/condicionais.
  Não é o EMC Pro: o nome ffb_pro.ino é um arquivo deste projeto aberto.
- Config.h deixa USE_TWOFFBAXIS desabilitado por padrão. HID.cpp usa NB_FF_AXIS
  na contagem de bits e no preenchimento do relatório; a posição do bit Direction
  Enable precisa ser lida em conjunto com essa configuração. ffb_pro.ino contém
  projeção por seno quando o bit de direção é detectado. Não confirma que remover
  seno seja uma solução universal, nem permite copiar o parser sem seu descritor.
- Os formatos e escalas diferem dos do Malth: há ganho/direção de16 bits e
  magnitude lógica até32767 na rotina examinada. Malth usa seus próprios campos,
  escala de magnitude10000, ganho255 e buffers limitados. Portar só um struct
  ou rotina pode fazer o firmware interpretar outros bytes como magnitude.
- pwm.ino tem modo PWM+- em D9/D10 e usa DIR_PIN como enable comum para BTS.
  Config.h define DIR_PIN11 em Leonardo/Micro e16 em ProMicro; o Malth precisa
  continuar usando D8. Os outros modos precisam manter a ligação aprovada.
- Configuração atual usa CDC serial; opção ConfigHID está marcada incompleta.
  Não substituir a configuração HID Malth por esse transporte automaticamente.
- Avisos permissivos aparecem nos arquivos FFB/HID consultados. Não foi
  encontrada licença raiz única nas árvores consultadas; bibliotecas, executáveis
  e imagens incluídos não devem herdar uma licença por suposição.

Fontes:

- https://github.com/ranenbg/Arduino-FFB-wheel/blob/463a08058d3fe6d955e7b1e50f12e483e279558f/brWheel_my/ffb_pro.ino
- https://github.com/ranenbg/Arduino-FFB-wheel/blob/463a08058d3fe6d955e7b1e50f12e483e279558f/brWheel_my/ffb.ino
- https://github.com/ranenbg/Arduino-FFB-wheel/blob/463a08058d3fe6d955e7b1e50f12e483e279558f/brWheel_my/HID.cpp
- https://github.com/ranenbg/Arduino-FFB-wheel/blob/463a08058d3fe6d955e7b1e50f12e483e279558f/brWheel_my/pwm.ino
- https://github.com/ranenbg/Arduino-FFB-wheel/blob/463a08058d3fe6d955e7b1e50f12e483e279558f/brWheel_my/Config.h

## Arduino-FFB-gui

- Programa Processing/Java de configuração e monitoramento por serial115200.
  Não é uma ponte que precisa retransmitir os efeitos do ETS2: esses chegam
  ao firmware pelo HID PID. O protocolo da GUI corresponde ao firmware ranenbg,
  não ao protocolo Malth de65 registradores sobre Feature0x40.
- Profile_class.pde guarda/carrega perfis e calibrações. FFBgraph_class.pde e
  wheel_control.pde mostram força X/Y a partir de telemetria. Esses recursos
  ajudam como referência para um diagnóstico visível no Malth, que já tem
  contadores PID no Feature0x41, mas ainda não tem painel de efeitos recebidos.
- O cabeçalho de wheel_control.pde concede uso/modificação/distribuição com
  preservação dos avisos; não há licença raiz única identificada na árvore.
  Conferir os demais arquivos/recursos antes de reaproveitar diretamente.

Fontes:

- https://github.com/ranenbg/Arduino-FFB-gui/blob/155a5e82af9f2bc0c71b2ac57f5aeeb1ee4535ed/README.md
- https://github.com/ranenbg/Arduino-FFB-gui/blob/155a5e82af9f2bc0c71b2ac57f5aeeb1ee4535ed/wheel_control.pde
- https://github.com/ranenbg/Arduino-FFB-gui/blob/155a5e82af9f2bc0c71b2ac57f5aeeb1ee4535ed/Profile_class.pde
- https://github.com/ranenbg/Arduino-FFB-gui/blob/155a5e82af9f2bc0c71b2ac57f5aeeb1ee4535ed/FFBgraph_class.pde

## Aplicação ao Malth Pro

Prioridade: conferir a cadeia de criação/início/atualização de Constant Force
contra o diagnóstico0x41 e testar ETS2 com0.1.7; depois tratar sinais, escala,
envelopes/duração e custo de cálculo com testes específicos. Contagens de efeitos
também diferem: Malth6, AFFB14 e ranenbg11. Aumentá-las exige orçamento SRAM;
não basta trocar MAX_EFFECTS no Leonardo.

Nenhum firmware, pinagem ou artefato1.3.1 foi modificado nesta revisão documental.
Não foi afirmada compatibilidade física nem suporte completo aos jogos com base
apenas na existência dessas fontes. A comparação reduz a dependência de estudar
rotinas protegidas do EMC; mudanças futuras devem preservar os avisos de autoria,
o protocolo próprio e a ligação fixa do usuário.

Depois desta revisão inicial, o usuário autorizou reaproveitamento e revisão
completa de FFB/freio. A implementação resultante1.3.2/0.1.8 e os testes estão
em UPDATE_1.3.2.md. Confirmou ambos os EN juntos em D8. A emulação do HEX EMC
confirmou dependência de D11 nos modos2DIR; essa limitação física foi preservada.


Em03/11, solicitação reforçada para EMC Pro e HEXFFBWheel0.16. Novo arquivo localizado separadamente em Downloads, hash85c22fd7ac5bbe6521f4a438cadb862adc5492f3d0cd9ffb4252de341813b72b. Relato após0.1.10 continua sem terreno/FFB perceptível; análise não encerrada. Veja UPDATE_1.3.5.md.
