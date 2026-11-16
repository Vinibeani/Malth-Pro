# Malth Pro 1.3.3 / firmware 0.1.9

## Falha observada e correção

Em03/11/2026 o usuário testou1.3.2/0.1.8 no ETS2 e continuou sem FFB.
App instalado1.3.2 e firmware0.1.8 confirmados pelo executável e registro.
Leitura independente Feature0x41, sem consumir a fila de configuração:

- Primeiro intervalo: efeitos recebidos, um Constant Force em execução,
  magnitude850, força calculada até859, zero rejeições, porém status PID0x14,
  D8 baixo e OCR1A/OCR1B zero. A habilitação PID impedia a saída do motor.
- Intervalo de45s acompanhado enquanto o usuário testava:725 amostras,
  posição−344..320, status0x14 em todas; nenhum efeito alocado, força zero.
  Rejeições subiram de1864 para17718 e criações permaneceram51. O contador
  recebido saturou em65535. Esse segundo estado ainda exige conferência no jogo.

O comando DC Reset limpava pausa e o bit Actuators Enabled. Isso contraria
[USB PID1.0, seção5.13, página23](https://www.usb.org/sites/default/files/documents/pid1_01.pdf):
Reset deve limpar pausa/efeitos e habilitar os atuadores. Corrigido para
`status = (status & ~1) | 2`, mantendo o restante dos bits. Disable explícito
continua funcionando; perda de USB, heartbeat, falta de centro e demais
condições de desarme não foram removidas. Sem alteração de pinagem ou potência.

O teste anterior da0.1.8 também esperava incorretamente os atuadores desligados
após Reset. A expectativa foi corrigida pelo padrão, não pelo código existente.
Sequência Reset→Create→Set Effect/Constant850→Start, incluindo direção63 e
Direction Enable4 observados, falhou em três verificações antes do ajuste.
Após corrigir o handler,68 verificações de efeitos e142 de controle/PID AVR
passaram. A habilitação após Reset não depende de um novo ARM do aplicativo.

Não houve captura completa dos pacotes do ETS2: as primeiras sondas REA/Frida
não observaram escritas HID e a tentativa seguinte foi interrompida por limite
temporário da revisão automática. Depois o jogo já estava fechado e as sessões
anteriores não permaneciam abertas. Não atribuir por certeza toda a sequência
de desalocação ao Reset ou afirmar que este era o único defeito no jogo.

## Diagnóstico e preservação

Feature0x41 conserva64 bytes e acrescenta último Device Control no byte62 e
último Block Free no63, antes reservados. Permite distinguir Reset/Disable/
liberação no próximo ensaio. Atualização mantém os65 registradores, EEPROM
schema1, descritores, transportes e D8/D9/D10. Sem teto fixo de bancada e sem
alteração dos valores escolhidos pelo usuário.

Com a fonte12V desligada por confirmação do usuário, salvos1024 bytes de
EEPROM e32768 de flash antes da gravação. Firmware0.1.9 gravado pelo Caterina
e27776 bytes verificados. EEPROM antes/depois idêntica. Malth Pro1.3.2 já
instalado reconectou automaticamente e identificou0.1.9. Backups ficam locais
em firmware/build, excluídos do ZIP de fontes.

Conferência no Leonardo real, jogo fechado e sem alimentação do motor:
Disable levou status22→20; Reset20→22; pausa0, efeitos alocados0 e força0.
Nenhum efeito de torque foi criado. É validação do protocolo, não de FFB físico.
Firmware:27776/28672 bytes de flash e1850/2560 bytes globais SRAM, sem pilha.

## Aplicação a jogos e pendências

A correção segue USB HID PID e serve aos clientes desse protocolo; não há
desvio especial para ETS2 ou ATS. Compatibilidade integral com todo jogo não
foi comprovada. O usuário dispõe de ETS2/ATS para teste e informou que não
poderia testar novamente neste momento. Nenhum jogo recebeu marca de validado.

Próximo ensaio: iniciar o jogo novamente para recriar os efeitos e monitorar
status, lastControl/lastFree, alocação/rejeições e PWM enquanto estiver dirigindo.
Confirmar sensação física com a intensidade escolhida pelo usuário; verificar
também reconexão/foco e ATS. Não alterar o perfil para um valor predefinido.

Instalador1.3.3 inclui HEX0.1.9 e mantém recursos da1.3.2. Não foi instalado
nesta rodada; o aplicativo1.3.2 em uso é compatível com o novo firmware.
