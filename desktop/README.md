# Malth Pro para Windows

## Atualização1.3.8 — câmbio

Captura identificada fora do mapa, faixas reais, cálculo das linhasX/Y e
Concluir salvando. Prévia sequencial comR requer firmware0.1.13 noArduino.
ComandosUSB25/26 continuam genéricos. Ver docs/UPDATE_1.3.8.md.


## Atualização1.3.7 — Configurações

Atalho de centralização no container central, acima de Aparência. Roda de cor
e prévia do volante compactadas; três containers sem rolagem na janela1080×620
com zoom1,2. Firmware0.1.12 preservado. Ver docs/UPDATE_1.3.7.md.


## Atualização1.3.3 — Reset USB PID

Use firmware0.1.9: Reset limpa efeitos/pausa e habilita atuadores pelo padrão.
Gravado/verificado com EEPROM preservada; conferência Disable/Reset na placa
aprovada sem criar forças. Novo teste físico ETS2/ATS pendente. App1.3.2
instalado também é compatível. Ver docs/UPDATE_1.3.3.md.

## Atualização1.3.2 — efeitos, freio e Fórmula1

Use firmware0.1.8 para envelopes/pausa/início atrasado e calibração Hall
crescente ou decrescente. Prévia do freio aplica a curva uma vez; há modelo
Fórmula1. D8/D9/D10 preservados; modos2DIR requerem outra ligação e continuam
indisponíveis. Sem validação física nesta rodada. Ver docs/UPDATE_1.3.2.md.

## Atualização 1.3.1 — FFB de um eixo e imagens de volante

Use firmware0.1.7 para declarar somente X como atuador e preservar força
constante assinada, sem projeção XY. Há modelos Padrão/Scania e PNG externo.
Validação ETS2 energizada ainda pendente; consulte docs/UPDATE_1.3.1.md.

## Atualização 1.3.0 — configuração por HID

Configuração, perfil, centralização e heartbeat usam Feature Reports HID.
O aplicativo não abre a porta COM. Requer firmware 0.1.5; versões anteriores
não possuem a coleção de configuração. A COM permanece para upload pelo Caterina.
A configuração do EMC Lite foi inspecionada estaticamente pelo REA; o Malth
implementa protocolo próprio no mesmo tipo de transporte, sem copiar DLL protegida.


## Atualização 1.2.11 — batente no ângulo escolhido

Firmware 0.1.4 remove a antecipação do batente suave nos últimos 10% do curso.
900° correspondem a ±450° e 1080° a ±540°, sem força de batente dentro dessa
faixa. Suave e rígido atuam progressivamente além dela, sem a queda de força
na antiga troca de cálculo. Intensidades e limites continuam definidos no perfil.
É necessário gravar o novo HEX para mudar o comportamento na placa.

## Atualização 1.2.10 — contorno original do ícone

O ícone M do cabeçalho conserva seu contorno original (#13799a), independente
da roda de cores. Os demais destaques continuam seguindo a cor selecionada.
Sem mudanças de comunicação, força ou firmware nesta revisão visual.
Diagnóstico real de 02/11/2026: timeout de PING precedeu Access denied na COM4;
fechar/reabrir o aplicativo não recuperou a porta. Causa inicial ainda aberta.

## Atualização 1.2.9 — recuperação e diagnóstico USB

Perda da sessão do firmware também dispara reconexão, mesmo sem a COM sumir.
Uma segunda abertura do aplicativo traz a janela existente, evitando duas sessões
disputando a porta. Erros de comunicação não são mais apresentados como prova de
outro programa usando o Arduino. A última falha fica no diagnóstico VOLANTE;
o erro original é registrado localmente em `%APPDATA%/Malth Pro/connection.log`
(128 KiB e um arquivo anterior), sem perfis ou leituras dos controles.
Firmware permanece 0.1.3. Recuperação física sob carga ainda não validada.

## Atualização 1.2.8 — força definida pelo perfil

Firmware 0.1.3 remove o teto fixo de 25%. A força mínima e máxima são escolhidas
pelo usuário de 0 a 100%; presets não mudam esses limites. Valores já salvos
permanecem. Use `Malth Pro-v0.1.3.hex` para remover o limite na placa.


## Atualização 1.2.7 — conexão automática e personalização

Conecte o Leonardo e abra o aplicativo. O último perfil selecionado é restaurado
e aplicado automaticamente, inclusive no primeiro uso. Trocar perfil aplica seus
ajustes salvos. Ícone VOLANTE serve somente ao diagnóstico; Esc e Desconectar
não interrompem mais o FFB. Firmware 0.1.2 preservado. Veja `docs/UPDATE_1.2.7.md`.

Aba Configurações substitui a engrenagem: roda de cores com Intensidade,
PNG personalizado do volante e controles de encoder/BTS/PWM. Presets FFB
de 10% a 100% com edição Manual e limite de bancada preservado.

## Atualização 1.2.6 — mapa do câmbio

Grade fixa removida: as áreas de marcha acompanham somente as linhas azuis XY.
Instalador `Malth Pro v1.2.6.exe`. Firmware permanece 0.1.2, sem necessidade de
regravação por esta correção. Veja `docs/UPDATE_1.2.6.md`.

## Atualizacao 1.2.5 — matriz e limite de angulo

Angulo limitado a 1080 graus. Matriz em Cambio > Modo > Botoes, com grade 4x4
compacta dos botoes 1..16 e destaque azul dos pressionamentos fisicos. Use o firmware
`firmware/releases/Malth Pro-v0.1.2.hex` para os novos modos BTS, a telemetria da matriz e o
limite tambem no Arduino. A imagem esta incluida no instalador.
Os demais pinos e as correcoes de centralizacao/inversao da 1.2.4 permanecem.
Veja `docs/UPDATE_1.2.5.md` para instalacao e roteiro de bancada.

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
Desde 1.2.7, Esc não altera a força. Fechar o aplicativo continua encerrando
a sessão; o firmware desabilita o motor por perda de comunicação.

Desde 1.2.7, a porta é identificada automaticamente e o firmware é conferido
antes de aplicar o perfil e habilitar a força. Não há conexão manual.

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
se comunica com o firmware 0.1.9 por Feature Reports HID e também lê o
Arduino como controle USB para mostrar os eixos na interface. Não abre porta COM.

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

## Firmware e comunicação atual — 1.3.3

Use o firmware `firmware/releases/Malth Pro-v0.1.9.hex`. O instalador
tambem inclui uma copia em `resources/firmware/` na pasta do aplicativo.
Os jogos leem as entradas HID e o aplicativo recebe a telemetria bruta e as
confirmacoes do firmware por HID Feature Reports. Os efeitos FFB dos jogos seguem
diretamente pelo HID PID ate o Leonardo.

O protocolo 2 usa linhas ASCII curtas: `HELLO 2`, `BEGIN`, blocos `SET`,
`COMMIT`, `SAVE`, `CENTER`, `ARM`, `DISARM` e `PING`. O AVR responde em JSON.
O perfil so e aplicado apos confirmar os 65 registradores, e a gravacao na
EEPROM tem confirmacao separada. O protocolo 1 dos instaladores anteriores
nao e compativel com esta versao do firmware.

As operacoes sao assincronas, com fila limitada, confirmacoes e tempo limite.
Uma coleção HID de configuração só passa a Conectado após identificar o firmware Malth Pro.
Desde o firmware 0.2.0 (`ffbAuto` no HELLO), o FFB nao depende do aplicativo: o PING so mantem a sessao de configuracao e fechar o app nao envia DISARM.
Veja `firmware/README.md` para calibracao, funcionamento do FFB e limites da
versao de bancada. A comunicacao e os calculos foram testados com substituto de
HID e emulação AVR. Historicamente,0.1.5 foi gravado/verificado e a leitura HID
sem potência foi concluída;0.1.6 foi identificado em execução. O usuário relatou
batente estável nessa versão, mas ausência de FFB no ETS2. A versão0.1.8 foi
posteriormente identificada/testada no ETS2 e continuou sem força. A0.1.9 foi
gravada e teve Disable/Reset conferidos sem potência; novo teste no jogo pendente.

## Assinatura local de teste

O pacote pode ser assinado com um certificado de teste instalado no repositório
de certificados deste PC. O certificado identifica o publicador como “Malth
Pro”, mas não é uma identidade comercial validada e não cria reputação pública
no SmartScreen. A confiança deve ser limitada ao computador de desenvolvimento.
Não desative o Microsoft Defender ou o SmartScreen para instalar o programa.
