# Malth Pro para Windows

## Atualizacao 1.2.3 — espacamento dos pedais

Os quatro pedais e o botao de linearidade ocupam cinco faixas de altura igual.
O espaco livre ao redor da linearidade foi distribuido entre os pedais, com
o botao no centro. Janela 1080 x 620, comunicacao e firmware preservados.
Modo padrao mantido em 2 PWM + 1 DIR conforme solicitado. Nao exige novo HEX.

## Atualizacao 1.2.2 — Force Feedback automatico

Apos conectar, o aplicativo aplica o perfil, define a posicao atual como centro
e habilita a forca. Deixe o volante reto ao conectar ou abrir o aplicativo.
Centralizar corrige a referencia e retoma a forca automaticamente. Salvar ou
trocar um perfil preserva o centro e retoma a forca apos a confirmacao do Arduino.
O botao manual de ativar/desativar foi removido; **Esc** interrompe a forca.
Depois de Esc, gravacoes e reconexoes nesta mesma sessao nao religam o motor;
use Centralizar para retomar. Fechar o aplicativo continua desarmando o motor.

Selecione a porta do Leonardo uma vez nesta atualizacao. Nas proximas vezes,
o aplicativo tenta reconectar apenas ao dispositivo cuja identidade foi salva;
o protocolo Malth Pro e conferido antes de aplicar o perfil ou habilitar a forca.
Desconectar pelo menu suspende a reconexao ate uma nova conexao manual.

Em jogos sem FFB, use **Efeito fora do jogo > Mola**, ajuste a intensidade e
salve. Em jogos com FFB, use **Desligado** nesse efeito para nao somar a mola
local aos efeitos do jogo. Habilitar o FFB nao significa aplicar torque constante:
o torque depende dos efeitos e dos limites configurados.

HEX Leonardo 0.1.0 inalterado; esta alteracao funciona pelo aplicativo e nao
exige regravar o Arduino. Motor/jogos e o novo fluxo automatico aguardam
validacao de bancada; o limite de saida de 25% permanece.

## Atualizacao 1.2.1 — nomes dos controles

A aba de forca usa **Force Feedback**, e o modo de cambio em H usa
**H-Shifter**, conforme solicitado. Demais textos em portugues. O firmware
0.1.0 permanece compativel, sem necessidade de regravar o Arduino.

## Atualizacao 1.2.0 — interface em portugues

Janela de 1080 x 620, com a mesma altura e o tamanho dos controles preservado.
Textos, menus, avisos e instalador em portugues brasileiro. Os valores internos
dos perfis e o protocolo do Arduino continuam compativeis com o HEX 0.1.0.
Os botoes Minimo/Maximo capturam os limites sem mensagens de confirmacao; uma
captura indisponivel ou invalida e ignorada sem alterar os limites anteriores.
O painel ao vivo do cambio sequencial ocupa a largura disponivel e continua
usando apenas o eixo Y; o cambio em H mantem o mapa X/Y.

## Correcao 1.1.1 — pedais opcionais

As barras de embreagem e freio de mao agora ficam em zero quando os canais
estao desabilitados. As leituras brutas de diagnostico nao alimentam os
medidores nem a captura Min/Max desses canais. Ao habilitar, a leitura volta.
Clique em Salvar para aplicar o estado dos canais ao Arduino. O firmware
Leonardo 0.1.0 continua compativel e nao precisa ser regravado por esta correcao.

Este pacote abre a interface existente em uma janela própria do Windows. Ele
carrega os arquivos locais de `malth-control/`, preservando a tela, o CSS, os
ícones e a navegação do protótipo. Não abre uma página hospedada nem depende de
um navegador instalado.

O `.hex` é outro artefato: grava o firmware no Leonardo. O aplicativo instalado
se comunica com esse firmware pela porta USB serial (115200 baud) e também lê o
Arduino como controle USB para mostrar os eixos na interface.

## Gerar o instalador local

Na primeira vez, execute `scripts/create-local-test-certificate.ps1`. Ele cria
um certificado de teste cujo publicador é “Malth Pro” e o confia somente para a
conta atual do Windows. A chave privada fica no repositório de certificados do
Windows e não é exportada. Depois execute `scripts/build-windows.ps1`; ele gera
e confere a assinatura do instalador em `dist/windows/`.

O computador precisa ter Node.js e acesso ao registro de pacotes na primeira
montagem. Este certificado é apenas para instalação de teste neste PC. Não
desative o Microsoft Defender ou o SmartScreen. O SmartScreen ainda pode exibir
um aviso de reputação porque o certificado de teste não é emitido por uma
autoridade pública.

## Firmware e comunicacao — versao 1.1.0

Use o firmware `firmware/releases/MalthPro-Leonardo-v0.1.0.hex`. O instalador
tambem inclui uma copia em `resources/firmware/` na pasta do aplicativo.
Os jogos leem as entradas HID e o aplicativo recebe a telemetria bruta e as
confirmacoes do firmware pela USB serial. Os efeitos FFB dos jogos seguem
diretamente pelo HID PID ate o Leonardo.

O protocolo 2 usa linhas ASCII curtas: `HELLO 2`, `BEGIN`, blocos `SET`,
`COMMIT`, `SAVE`, `CENTER`, `ARM`, `DISARM` e `PING`. O AVR responde em JSON.
O perfil so e aplicado apos confirmar os 65 registradores, e a gravacao na
EEPROM tem confirmacao separada. O protocolo 1 dos instaladores anteriores
nao e compativel com esta versao do firmware.

As operacoes sao assincronas, com fila limitada, confirmacoes e tempo limite.
Uma porta COM aberta so passa a Conectado apos identificar o firmware Malth Pro.
O aplicativo deve ficar aberto para enviar as confirmacoes de vida do motor.
Veja `firmware/README.md` para calibracao, funcionamento do FFB e limites da
versao de bancada. A comunicacao e os calculos foram testados com substituto de
porta serial e emulacao AVR; o dispositivo fisico e os jogos ainda precisam ser
validados.

## Assinatura local de teste

O pacote pode ser assinado com um certificado de teste instalado no repositório
de certificados deste PC. O certificado identifica o publicador como “Malth
Pro”, mas não é uma identidade comercial validada e não cria reputação pública
no SmartScreen. A confiança deve ser limitada ao computador de desenvolvimento.
Não desative o Microsoft Defender ou o SmartScreen para instalar o programa.
