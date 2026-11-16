# Compatibilidade do Malth Pro com jogos no Windows

Pesquisa: 30/10/2026. Aplicativo 1.2.6; firmware Leonardo 0.1.2; BTS7960 em 2PWM + 1DIR.

Atualização de bancada03/11/2026: usuário confirmou direção no ETS2 e batente
local com firmware Malth, mas ausência de FFB durante o jogo na versão0.1.6.
O jogo enumerou os efeitos e estava com FFB habilitado. A revisão1.3.1/0.1.7
corrige declaração de atuador/projeção da magnitude; ainda não validada no jogo.

## Conclusão e limites

Não há jogo validado em bancada com todas as funções deste Malth Pro. As classificações abaixo são expectativas técnicas derivadas do código e da documentação dos fabricantes, não certificação nem teste de jogo. Um jogo aceitar controles DirectInput não garante que aceite todos os relatórios PID do firmware ou execute todos os efeitos.

O firmware declara joystick HID genérico, 32 botões e sete eixos; usa X para direção, Y/Z para acelerador/freio, Rx para embreagem, Ry para freio de mão, Rz/Rudder para leituras do câmbio. Matriz usa botões 1–16; marchas H usam 17–24; sequencial usa 25–26. Mapeamento manual pode ser necessário. Não se apresenta como um Logitech ou controle Xbox.

Fontes locais: `firmware/Leonardo/MalthProLeonardo/Controller.cpp:26`, `:244`, `:258`, `:269`, `:271`; `docs/ARCHITECTURE_TRACE.md`.

A implementação inclui força constante, rampa, efeitos periódicos e condicionais. Isso é evidência de implementação, não de conformidade integral HID/DirectInput. O jogo envia efeitos ao firmware via HID PID; desde1.3.0 o aplicativo também configura por HID e mantém a sessão habilitada. Manter o aplicativo aberto. Efeito local Mola não demonstra FFB vindo do jogo. Mínimo e máximo são definidos pelo usuário, sem teto fixo de25%; qualidade física dos efeitos ainda exige validação.

## Jogos pesquisados

| Jogo no Windows | Expectativa para o Malth Pro | Evidência e restrições |
| --- | --- | --- |
| BeamNG.drive | Forte candidato para entradas e FFB, com configuração manual | Documenta controles de PC, mapeamento para dispositivos sem preset e FFB associado à direção. Bom candidato para conferir também embreagem, câmbio H, sequencial e freio de mão. |
| Euro Truck Simulator 2 / American Truck Simulator | Direção ETS2 confirmada pelo usuário; FFB ETS2 falhou em0.1.6; correção0.1.7 pendente | SCS declara força constante por DirectInput. Registro do jogo reconheceu os efeitos, sem confirmar saída física. ATS e demais funções ainda não validados. |
| Assetto Corsa original | Forte candidato, ainda sem teste Malth Pro | Página oficial declara suporte amplo a joysticks, volantes e dispositivos profissionais. Mapear e calibrar manualmente. Câmbio H e embreagem dependem do carro; freio de mão depende do veículo/conteúdo. |
| Assetto Corsa Competizione | Bom candidato para entradas e FFB | 505 declara que controles reconhecidos pelo DirectInput podem ser usados, mas modelos não listados podem não ter suporte completo. Não equivale a um jogo para aproveitar todas as funções de um câmbio H. |
| iRacing | Bom candidato, ainda sem teste Malth Pro | Documenta controles personalizados, calibração, múltiplos dispositivos, FFB e freio de mão. Uso de H/embreagem/freio de mão depende do carro/modalidade. |
| Forza Motorsport (2023, PC) | Candidato com ressalvas | Microsoft declara DirectInput e remapeamento de dispositivos não convencionais. Isso fundamenta a expectativa de entradas; não garante FFB idêntico aos modelos com integração específica. Não confundir com Horizon. |
| DiRT Rally 2.0 | Candidato que pode exigir configuração adicional | Manual oficial permite classificar dispositivos desconhecidos como volante, habilitar FFB e cadastrar dispositivos manualmente. Pode exigir device_defines.xml/GUID e ajuste de capacidades. |
| Forza Horizon 5 | Compatibilidade completa não confirmada | Lista oficial não inclui Malth Pro. Perfis customizados existem, mas não bastam para garantir FFB do dispositivo genérico. Ausência da lista não prova incompatibilidade absoluta. |
| F1 25 | Compatibilidade completa não confirmada | Lista oficial contém modelos específicos, sem Malth Pro. Não extrapolar suporte de outro volante DIY para o Leonardo deste projeto. |
| EA SPORTS WRC | Compatibilidade completa não confirmada | Documentação de atualizações menciona dispositivos não suportados, mas não valida este firmware. Necessária investigação/configuração própria e teste. |

Não foi concluída avaliação específica de Automobilista 2, rFactor 2, RaceRoom, Le Mans Ultimate ou outros títulos. Não devem receber marca de compatível apenas por semelhança com os anteriores. A pesquisa é para Windows, sem conclusão sobre consoles.

## O que o REA mostrou no EMC

Inspeção estática dos binários locais do EMC Pro e Lite, sem executar EMC, jogos ou firmware. Pro EMC.dll SHA-256 `db425188335289a2644c8a85268e8a64f0d1dd1debc9e6a8c1bddaf4db036dfb`, MVID `f55c95fd-3d86-45cd-899d-17bf1dd580f2`.

- REA identificou declarações de `HidD_SetFeature`, `HidD_GetFeature`, `HidD_GetInputReport`, `CreateFile`, `ReadFile`, `WriteFile` e enumeração de interfaces USB no Pro; Lite EMCHid.dll contém declarações equivalentes para HID e leitura/escrita.
- Pro contém tipos `EMC.Model.HidUtility`, `Device` e `UsbBuffer`, e propriedades/rotinas com nomes de relatórios e troca de configurações.
- Declarações nativas não são chamadas observadas. Rotinas relevantes são majoritariamente `malformed` na análise dos corpos, com evidência anterior de ofuscação. Até um pequeno corpo classificado como presente não permite reconstruir comportamento útil com confiança.
- A interpretação sustentada é de um configurador HID para a placa. Não foi comprovada uma ponte especial entre cada jogo e o aplicativo antigo nem equivalência exata de descritores/FFB entre EMC e Malth Pro.
- Documentação atual do autor para EMCFFBV2 afirma USB HID e jogos DirectInput. É outra geração (ESP32/STM32); serve como contexto e não prova o firmware Lite antigo.
- Evidências completas da rodada em `docs/emc-analysis/*-20261030.json`. Limitação residual: não houve captura USB nem execução controlada de jogo, e o descritor USB completo do firmware EMC antigo não foi comparado ao do Malth Pro nesta rodada.

## Validação pendente por jogo

1. Windows deve reconhecer todos os eixos e botões corretamente.
2. Configurar controles genéricos/volante e mapear direção, pedais e câmbio.
3. Conferir faixa completa e ausência de entradas cruzadas, inclusive Rz/Rudder do câmbio.
4. Com intensidade escolhida pelo usuário, confirmar força vinda do jogo, sentido restaurador, variação em curvas e irregularidades, sem depender da mola local.
5. Conferir embreagem, H/sequencial, matriz e freio de mão nos carros que disponibilizam essas funções.
6. Registrar versão do jogo, plataforma de distribuição, identificação Windows, configurações e resultado de cada função. Não marcar compatibilidade completa antes disso.

Prioridade prática de validação: BeamNG.drive ou Assetto Corsa para variedade de funções; ETS2/ATS para caminhões. Não é autorização para executar testes de motor ou jogos.

## Fontes primárias consultadas

- BeamNG: https://documentation.beamng.com/support/hardware/steering_wheel_setup/
- SCS FFB (ETS2/ATS): https://blog.scssoft.com/2021/10/force-feedback-faq.html
- SCS configuração de entradas: https://eurotrucksimulator2.com/input_config.php
- Assetto Corsa, descrição do desenvolvedor: https://store.steampowered.com/app/244210/Assetto_Corsa/
- ACC, suporte 505: https://support.505games.com/support/solutions/articles/150000147224-which-controllers-and-steering-wheels-is-assetto-corsa-compatible-with-
- iRacing: https://support.iracing.com/support/solutions/articles/31000133335
- Microsoft / Forza Motorsport: https://news.xbox.com/en-us/2023/10/11/designed-for-xbox-racing-wheels/
- DiRT Rally 2.0, manual oficial: https://cdn.steamstatic.com/steam/apps/690790/manuals/DR2_Multi_Input_Device_Configuration.pdf?t=1615221172
- FH5: https://support.forza.net/hc/en-us/articles/4409263414547-FH5-Supported-Wheels-and-Devices
- F1 25: https://help.ea.com/en/articles/f1/f1-25/controllers-wheels-and-vr-support/
- WRC, notas oficiais: https://forums.ea.com/discussions/wrc-general-discussion-en/ea-sports%E2%84%A2-wrc---release-notes/8346481
- Autor do EMCFFBV2: https://github.com/ebolzMagy/EMCFFBV2


## Revisão1.3.2 /0.1.8 — 03/11/2026

Além da declaração de um atuador da0.1.7, foram revisados envelopes, pausa,
início atrasado e calibração/curva Hall. Os testes de software passaram; não
houve novo teste de jogo ou gravação. Nenhuma classificação acima equivale
a validação física da0.1.8. Ver UPDATE_1.3.2.md.


## Revisão1.3.3 /0.1.9 — 03/11/2026

Usuário continuou sem FFB no ETS2 com0.1.8. Diagnóstico leu força calculada
com atuadores desabilitados, depois efeitos desalocados/rejeições. Corrigido
Reset USB PID que desabilitava atuadores contrariando seção5.13.0.1.9
gravada/verificada; Disable/Reset conferidos na placa sem forças. Novo teste
ETS2/ATS pendente por indisponibilidade do usuário. Correção do padrão não é
certificação de todos os jogos nem prova de que não há outra falha. Ver UPDATE_1.3.3.md.


## Ensaio positivoETS2 —03/11/2026,0.1.12

Usuário confirmou retorno e terreno. Captura180s/2910amostras857ativas,zero rejeições/overruns/reinícios. Valida essas funções neste ensaio, não todas as funções/veículos nem outros jogos. ATS ainda pendente; ver UPDATE_1.3.6.md.


### Falha posterior em colisão —0.1.12,03/11/2026

Após confirmar retorno e terreno, o usuário relatou colisão no ETS2: força maior, perda de comunicação e jogo travado. A aprovação tátil anterior permanece histórica, mas a estabilidade sob colisão FALHOU; não considerar a versão solução concluída.

connection.log:19:14:34.804(Brasília) PING ACK_TIMEOUT;19:15:22.683 HELLO ACK_TIMEOUT;19:15:29.247 reconexão0.1.12. Fonte12V desligada/USB mantido confirmados pelo usuário. Leitura passiva às19:18:29.767:uptime182449ms, indicando inicialização perto19:15:27;129amostras estáveis,força0,D8baixo,zero rejeições/overruns após reinício. Windows lista interfacesHID eCOM13 OK. Nenhum eventoUSB/PnP pertinente encontrado na consultaSystem20min. Causa do reinício NÃO determinada: não atribuir automaticamente a fiação, fonte, ruído ou firmware.

Ensaio lógico de mudanças abruptas, com fonteOFF e jogo encerrado:1927atualizações/30s,484amostras,força−4998..4998,zero rejeições/overruns/reset. Primeiro ensaio foi inválido por ausência de espera apósReset antesCreate, gerou rejeições e força0; descartado como evidência de saída, script corrigido com espera e verificação de playing/cobertura. Nenhum perfil/EEPROM/firmware/pinagem alterado. Esse ensaio não reproduz corrente, carga mecânica nem os pacotes exatos da colisão. Não prova que hardware é a causa. Registros preservados em firmware/build/connection-collision-012.log, hid-012-positive-before-collision.json e hid-collision-stress-012.json. Necessária captura contínua antes/durante a falha para distinguir travamento/reset e verificar alimentação/USB sob carga. Não solicitar nova colisão energizada agora.

Instalador1.3.6 foi gerado antes desta nova falha; não instalado, não apresentar como correção da desconexão. Firmware0.1.12 permanece gravado. ETS2 parcialmente aprovado para sensação; estabilidade reaberta. ATS/outros jogos pendentes.
