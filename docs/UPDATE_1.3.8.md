# Malth Pro 1.3.8 / firmware 0.1.13 — calibração do câmbio

## Problemas confirmados no código

Na1.3.7, as áreas para registrar1–7/R eram transparentes e sem identificação.
Classeis-captured era atribuída, mas não havia estilo que mostrasse a captura.
Os quatro camposX/Ymin/max eram editáveis no aplicativo, mas não eram
codificados nos65registradores nem utilizados pelo firmware. Capturar posições
não recalculava as cinco divisõesX/Y; sensores com curso estreito podiam
continuar na zona neutra ou em regiões ambíguas. Concluir apenas fechava o modo,
sem salvar/aplicar, apesar da mensagem sugerir aplicação.

## Comportamento corrigido

Durante a calibração há uma faixa de botões1,2,3,4,5,6,7,R FORA do mapa,
com destaque por captura. Números e vistos foram retirados do mapa após pedido
explícito do usuário; ao vivo ficam as linhasX/Y e o ponto da alavanca.
O indicador grande à esquerda foi preservado.

Engate cada marcha física e clique no botão correspondente. Após8/8, os pontos
das quatro colunas determinam as divisõesX; os extremos das fileiras determinam
as duas divisõesY com zona neutra entre elas. Colunas/fileiras sobrepostas são
recusadas. Faixa capturadaX/Ymin/max é somente leitura, obtida dos pontos reais;
não é uma segunda escala de ADC aplicada pelo firmware. Os cinco sliders
continuam sendo os limites efetivamente enviados e permitem ajuste manual.
Concluir salva no perfil e envia/persiste noArduino quando conectado; modo
incompleto ou inválido não conclui. Cancelar restaura a calibração anterior.
Metadados das marchas capturadas acompanham o perfil; protocolo65 preservado.

## Sequencial genérico e ré

Prévia local permiteR↔N↔1…7 no aplicativo e no firmware0.1.13. Um novo movimento
exige retorno à zona central; manter a alavanca acionada não repete a contagem.
Os botõesHID25(subir) e26(reduzir), numerados a partir de1, continuam sendo
enviados nos extremos da prévia: o limite visual não limita marchas do jogo.
A marcha real é determinada pelo jogo; não há telemetria de retorno.
Nenhuma regra foi vinculada exclusivamente aoETS2. Cada jogo precisa ter os
comandos de subir/reduzir associados e aceitar a seleção de ré dessa forma.

Consulta somente leitura do perfilETS2 encontrado mostroug_trans0 e subir/
reduzir no teclado, sem joystick nessas associações; seleçãojoy vazia. Não é
prova de configuração ativa em outro perfil. Usuário informouETS2 fechado e
reforçou escopo genérico para todos os jogos. Nenhum arquivoETS2 foi alterado.

## Verificações e limites

Usuário confirmou câmbio físicoX/Y conectado aA4/A5. Testes desta revisão foram
somente de software:4Node(calibração estreita, espelhamento, rejeição eR/N),
149verificaçõesAVR, eElectron comIPC simulado capturando8pontos, calculando e
salvando limites435/505/575e483/517, bloqueando conclusão incompleta e exibindoR.
Screenshotfirmware/build/shifter-calibration-138.png inspecionado.

HEX0.1.13 validado28300bytes, sem bootloader. SHA256:
7d7dad3a3da952ddaf67b2026ffa74c2d9e334df8eb825af076896e58a901b65.
Não houve gravação, comandoUSB real, mudança de pinagem ou teste energizado.
FFB não foi alterado; a desconexão sob colisão energizada permanece aberta.
Firmware conhecido na bancada permanece0.1.12 até uma gravação confirmada.
