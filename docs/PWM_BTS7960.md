# Modos PWM da BTS7960

Aplicativo 1.2.5, firmware Leonardo 0.1.2. Ligação fixa:

| Leonardo | BTS7960 |
| --- | --- |
| D8 | L_EN e R_EN juntos |
| D9 | L_PWM |
| D10 | R_PWM |
| 5 V / GND | VCC / GND |

O modelo fica fixo em BTS7960. A opção Índice Z foi removida: o encoder usa A/B.

## Dois modos selecionáveis

`m` representa a magnitude efetiva limitada a 25% na imagem de bancada.
Os sentidos abaixo seguem a convenção já utilizada pelo Malth Pro; a ligação
dos terminais do motor determina o sentido mecânico.

| Modo | Sentido | D8 | D9 | D10 |
| --- | --- | --- | --- | --- |
| 2PWM + 1DIR | Negativo | HIGH | PWM m | LOW |
| 2PWM + 1DIR | Positivo | HIGH | LOW | PWM m |
| 1PWM + 1DIR | Negativo | HIGH | PWM m | LOW |
| 1PWM + 1DIR | Positivo | HIGH | PWM 1−m | HIGH |

O segundo modo é uma adaptação à BTS7960 com esses três fios. D9 é o único
PWM, D10 passa a direção, D8 continua habilitando os dois lados. A inversão
de PWM no sentido positivo mantém a magnitude diferencial em m. Por exemplo,
75% de nível alto no D9 e D10 alto produzem 25% de acionamento diferencial,
não 75%. Não se deve simplesmente aplicar o mesmo duty nos dois sentidos.

Os quatro modos encontrados no firmware de referência não usam todos os
pinos com a mesma função. Copiar seus sinais de direção diretamente para D8
desabilitaria um sentido na ligação confirmada; outros usam D11. Por isso,
1PWM + 2DIR e 2PWM + 2DIR não são habilitados neste projeto de ligação fixa.
A alternativa de 1PWM acima é código próprio adaptado à tabela elétrica do
driver; não é uma cópia literal do modo homônimo da referência.

## Aplicação e transições

- Padrão anterior preservado: registro DRIVE_MODE=2.
- Alternativa adaptada: DRIVE_MODE=4; IDs próprios do Malth Pro.
- O aplicativo exige a capacidade `btsPwmDir=1` no HELLO antes de enviar o modo 4.
  Firmwares antigos continuam utilizáveis no modo padrão; não recebem o novo modo.
- Timer1 em Fast PWM, TOP=ICR1; frequência selecionável de 4 a 20 kHz.
- Em partida, troca de sentido ou modo, D8 fica baixo enquanto PWM/direção
  são preparados. Aguarda-se pelo menos dois períodos antes de habilitar D8.
  Os comparadores ficam estáveis durante essa espera.
- Em zero, Esc, perda de USB/sessão ou watchdog, a saída é desabilitada.
- O limite de 25% refere-se ao comando diferencial do motor, inclusive no
  modo de PWM invertido. O arredondamento dos comparadores não excede esse teto.
- A mudança de modo passa pela transação BEGIN/SET/COMMIT, com motor desarmado.

## Verificações realizadas

78 verificações dos cálculos em instruções AVR, sem falhas: configurações válidas,
saída zero, polaridades, canais ativos, magnitude diferencial, limite de 25%,
frequências de 4 a 20 kHz e cálculo do intervalo de assentamento.
Quatro testes do protocolo no PC, sem falhas: IDs de modo, rejeição de modos
incompatíveis e proteção de firmware antigo. Não acessam portas reais.

Essas verificações não simulam a eletrônica da BTS7960, a temporização física
das saídas, USB ou a resposta do motor. A bancada continua pendente.

## Conferir na bancada

1. Gravar o HEX 0.1.2 com a alimentação de potência desligada.
2. Começar no modo padrão 2PWM + 1DIR e com ganho baixo.
3. Conferir o sentido de restauração antes de elevar ganho; Esc interrompe a força.
4. Com osciloscópio/analisador, conferir D8 baixo na preparação e pelo menos
   dois períodos de espera ao trocar de sentido. Em zero, D8/D9/D10 devem baixar.
5. Comparar os dois modos com o mesmo ganho e frequência. Na alternativa,
   D10 deve ser estático em cada sentido, e D9 complementar no sentido positivo.
6. Conferir desligamento por Esc, perda de comunicação e USB desconectado.

Referências técnicas: [BTS7960, tabela de estados §4.4.5](https://www.infineon.com/assets/row/public/documents/10/57/infineon-bts7960-ds-en.pdf)
e [ATmega32U4, Timer1 §§14.6–14.10](https://ww1.microchip.com/downloads/en/devicedoc/atmel-7766-8-bit-avr-atmega16u4-32u4_datasheet.pdf).
