# Malth Pro 1.2.11 / firmware 0.1.4 — batentes no limite escolhido

02/11/2026.

## Causa da resistência antecipada

Firmware 0.1.3 iniciava SOFTLOCK a 90% de cada metade do curso, embora o
usuário configurasse o ângulo total. Para 900°: metade 450°, início 405°.
Para 1080°: metade 540°, início 486°. Corresponde à resistência perto de 400°/500°
relatada pelo usuário. Ganho suave ajustava a força, não esse início fixo.
O ramo HARDLOCK só começava além do limite; trocar de ramo podia derrubar
a resistência próxima da fronteira. Não são erros de transmissão do ângulo.

## Correção

- Nenhuma contribuição de batente dentro do curso escolhido, incluindo a
  fronteira exata: ±450° em 900° e ±540° em 1080°.
- Fora do curso, suave cresce em uma faixa de 10% da metade do curso, até
  a intensidade escolhida. Rígido preserva a progressão por deslocamento.
  Usa-se a maior força restauradora dos dois, sem troca descontínua de ramo
  ou soma que ultrapasse o comando máximo. Outro efeito restaurador maior
  é preservado; efeito que empurre para fora não supera o batente.
- Ambos em 0 respeitam o desligamento desses batentes. Mínima/máxima seguem
  o perfil e continuam sendo os limites finais; sem teto fixo de 25%.
- Contagens de meia faixa arredondadas para fora para não antecipar por
  truncamento. Resolução física do encoder limita a precisão a uma contagem.
- Multiplicação do batente rígido usa magnitude sem sinal para evitar overflow
  nos maiores CPR/ângulos válidos. Produto limitado à faixa de controle.
- Interface explica no título do ângulo o curso total e o limite por lado,
  e informa necessidade do firmware 0.1.4.

Batente elétrico oferece resistência finita; não é trava mecânica. Forças do
jogo, mola de desktop e amortecimento podem existir dentro do curso, conforme
o perfil. A correção remove a antecipação apenas da contribuição dos batentes.
EEPROM/protocolo/pinagem e modo 2PWM+1DIR preservados. Instalar o aplicativo
não grava firmware: é necessário carregar `Malth Pro-v0.1.4.hex` na placa.

## Validação e limites

108 verificações de controle/batentes em instruções AVR e 93 de PWM aprovadas.
Testes dos dois lados, interior/90%/fronteira/primeira contagem externa,
efeitos para fora/restauradores, ganhos 0 e CPR 32000/1080° sem inversão por overflow.
20 testes Node de protocolo/reconexão/PWM aprovados.
HEX compilado com 26.792 bytes de programa, checksums e região do bootloader
conferidos. Nenhum flash ou teste de força do 0.1.4 realizado pelo agente.

## Continuação da investigação USB

Usuário reconectou USB com fonte de potência desligada. COM4 voltou, app 1.2.9
identificou firmware 0.1.3 às 21:35:28 de Brasília, aplicou perfil e permaneceu
136 segundos sem nova falha registrada. Usuário confirmou acompanhamento
normal ao mover pela faixa antes problemática; leitura de 289° observada.
Tema rosa, PNG Scania e 900° reapareceram nesta abertura; suspeita anterior
de perda de preferências não confirmada.

Resultado separa o teste sem potência do problema relatado sob carga. Não
identifica sozinho causa elétrica, USB ou firmware e não comprova correção
da desconexão pelo novo cálculo de batente. Nenhum novo ensaio energizado.
