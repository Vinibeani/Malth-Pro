# Malth Pro — histórico técnico e de bancada

Consolidação em 06/11/2026. Este caderno acompanha o projeto desde o protótipo até o último relato de bancada, em 04/11. Os documentos por versão guardam os detalhes de cada rodada, inclusive decisões que foram substituídas mais tarde.

## Estado na última confirmação

| Área | Evidência disponível |
| --- | --- |
| Câmbio H, encoder e sequencial | O usuário informou que os três testes passaram em 04/11. |
| Force Feedback | O usuário informou funcionamento nos testes atuais e seguirá observando durante o uso. Há um ensaio anterior de retorno e terreno no ETS2 e um incidente posterior de desconexão em colisão. |
| Pedais Hall | Calibração, polaridade, curva e máscara verificadas em software. Ensaio dos pedais físicos pendente. |
| Matriz 4×4 | Leitura e visualização implementadas. Ensaio físico dos 16 botões pendente. |
| Aplicativo | Instalador e fontes 1.3.8 entregues. O último executável instalado inspecionado era 1.3.7. |
| Firmware | HEX 0.1.13 compilado e conferido. Última gravação acompanhada e verificada foi a 0.1.12. O relato de 04/11 não especificou as versões usadas. |

[[Projetos/Malth Pro/Entregas|Arquivos de entrega]] · [[Projetos/Malth Pro/Mapa tecnico|Mapa técnico]] · [[Projetos/Malth Pro/Documentacao/docs/PROJECT_STATUS|Estado técnico por componente]]

## Da concepção à entrega Windows

O protótipo partiu das referências Lite e Pro e foi refinado para a edição Pro. As iterações definiram a marca Malth Pro, o ícone M, o tema escuro, as barras dos quatro pedais, a curva de freio, a imagem giratória do volante e as visualizações H e sequencial. A entrega evoluiu para um aplicativo Electron de 1080 × 620, com janela arrastável, minimizar e fechar. A aparência aprovada no protótipo orientou a versão instalada.

O aplicativo passou a ter quatro abas: Principal, Force Feedback, Câmbio e Configurações. A matriz aparece na própria aba Câmbio, pelo modo Botões. Configurações reúne encoder/Ponte H, atalho/Aparência e imagem do volante. O seletor aceita Padrão, Scania, Fórmula 1 ou PNG externo de até 2 MB. A cor é escolhida na roda ou em hexadecimal, com intensidade ajustável, trilho uniforme e contorno original do ícone preservado.

Os perfis guardam ajustes por usuário, permitem renomear inclusive o Padrão, importar/exportar JSON e excluir perfis adicionais. A conexão passou a restaurar o último perfil salvo. Renomear altera o nome local. Trocar perfil aplica os valores salvos e reconectar preserva o rascunho exibido. O botão VOLANTE mostra o diagnóstico da conexão. Centralizar atua no centro da sessão e pode ser associado a tecla, combinação ou botão do Malth Pro.

[[Projetos/Malth Pro/Documentacao/README|Manual do projeto]] · [[Projetos/Malth Pro/Documentacao/desktop/README|Aplicativo Windows]]

## Linha do tempo das versões

A versão 1.2.3 aparece na primeira análise de arquitetura, que identificou dois defeitos: a inversão aplicada novamente na imagem do volante e a referência de centro desatualizada na sessão após mudar CPR ou INVERT. Essa análise levou à 1.2.4. O arquivo local também conserva os HEX 0.1.0 e 0.1.1. A presença desses arquivos documenta o acervo, enquanto a tabela abaixo registra as entregas com notas de revisão próprias. [[Projetos/Malth Pro/Documentacao/docs/ARCHITECTURE_TRACE|Análise da 1.2.3]]

| Versão do aplicativo | Mudança e contexto do firmware |
| --- | --- |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.2.4\|1.2.4]] | Corrigiu inversão duplicada da imagem quando o Leonardo já fornecia direção processada. Renovou a centralização após CPR/inversão e tornou consistente a cópia do perfil durante o envio. Firmware registrado nessa revisão: 0.1.0. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.2.5\|1.2.5]] | Curso de 30° a 1080°, matriz dentro de Câmbio, encoder sem Z e dois modos BTS compatíveis com a montagem. Firmware 0.1.2. Ajustes no nome de perfil e nos artefatos. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.2.6\|1.2.6]] | Retirou a grade fixa de oito quadrados. As guias X/Y passaram a delimitar as regiões e o neutro. Instalador e fontes receberam a numeração pedida. HEX 0.1.2 preservado. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.2.7\|1.2.7]] | Conexão e ativação automáticas após identificar a placa, aplicação do perfil e centralização. Saiu o comando Esc; entrou a aba Configurações com roda de cor, explicação PPR × 4 e PNG externo. Presets FFB em passos de 10% e edição manual. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.2.8\|1.2.8]] | Firmware 0.1.3 removeu o teto fixo de 25% e a compensação mínima obrigatória. Mínima e máxima passaram a respeitar o perfil; presets preservam essas duas escolhas. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.2.9\|1.2.9]] | Diagnóstico e recuperação de comunicação após travamentos sob carga. Erros e tentativas de reconexão ficaram registrados. HEX 0.1.3 mantido. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.2.10\|1.2.10]] | Contorno do ícone fixado na cor original, separado dos destaques temáticos. Firmware 0.1.3 preservado. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.2.11\|1.2.11]] | Firmware 0.1.4 transferiu a ação dos batentes para fora da meia faixa configurada. Para 900°, o limite é ±450°; para 1080°, ±540°. Antes, o batente suave começava a 90% de cada metade. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.0\|1.3.0]] | Firmware 0.1.5 migrou configuração e telemetria de serial para HID Feature 0x40. A revisão de bancada 0.1.6 acrescentou diagnóstico passivo 0x41. Houve teste de comunicação real e comparação com EMC Lite. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.1\|1.3.1]] | Firmware 0.1.7 anunciou um único eixo físico de força X e eliminou o caso em que a direção zero anulava a força assinada. Seletor de imagens Padrão/Scania/externo. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.2\|1.3.2]] | Firmware 0.1.8 refinou efeitos, envelopes, rampa, repetição, pausa, atrasos e cálculo de movimento. Calibração Hall passou a aceitar polaridade crescente ou decrescente. Prévia da curva e volante de Fórmula 1 incorporados. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.3\|1.3.3]] | Firmware 0.1.9 corrigiu o Reset HID PID para reabilitar atuadores ao limpar pausa e efeitos. Diagnóstico passou a informar os últimos comandos de controle e liberação. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.4\|1.3.4]] | Acelerador e freio ganharam controles de habilitação por perfil. Atalho de centralização passou a aceitar teclado ou botão do volante, usando o CENTER existente. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.5\|1.3.5]] | Três painéis em Configurações, campo hexadecimal e trilho curto da intensidade. Firmware 0.1.10 corrigiu o sentido aplicado aos efeitos direcionais conforme a convenção DirectInput. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.6\|1.3.6]] | Auditoria dos 18 ajustes FFB. Firmware intermediário 0.1.11 tentou concluir a comutação no laço principal. 0.1.12 passou a concluí-la pelo Timer1, recuperando respostas rápidas que eram interrompidas pelo assentamento. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.7\|1.3.7]] | Atalho movido acima de Aparência. Roda de cor e prévia do volante compactadas. Três painéis conferidos sem rolagem na janela real com zoom 1,2. HEX 0.1.12 mantido. |
| [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.8\|1.3.8]] | Capturas identificadas em faixa fora do mapa. Oito posições recalculam limites, Concluir salva e Cancelar restaura. Firmware 0.1.13 acrescentou R à prévia sequencial local. |

## Hardware, entradas e protocolo

| Ligação | Função |
| --- | --- |
| Leonardo ATmega32U4, 16 MHz | Controlador USB e firmware do projeto. |
| D0 / D1 | Encoder incremental A/B. CPR usa PPR × 4 quando a ficha fornece pulsos, sem multiplicar novamente contagens já decodificadas. |
| A0 / A1 / A2 / A3 | Acelerador, freio, embreagem e freio de mão. Sensores Hall 49E e ímãs foram escolhidos pelo usuário. |
| A4 / A5 | Sensores X/Y do câmbio físico, confirmados pelo usuário. |
| D8 / D9 / D10 | BTS7960, com as duas habilitações juntas em D8 e saídas em D9/D10. |
| D12, D7, D6, D5 / D4, D14, D15, D16 | Colunas e linhas da matriz 4×4. D14–D16 ficam no ICSP. |
| Motor 775 e fonte 12 V / 30 A | Especificação informada pelo usuário para a bancada. |

A configuração 2PWM + 1DIR usa D8 como habilitação comum e D9/D10 como PWM. A variante 1PWM + 1DIR usa D9 para PWM e D10 para direção, com D8 ainda comum. Os modos de referência com dois sinais de direção exigem ligações diferentes, inclusive D11 no EMC. A disponibilidade de quatro modos num HEX de referência não torna os quatro compatíveis com esta montagem.

O aplicativo usa o perfil e a telemetria pelo HID de configuração 0x40. O diagnóstico 0x41 registra estado e contadores sem consumir a fila de configuração. Entradas e efeitos de jogo passam pelo HID do volante e pelos relatórios USB PID. A interface serial do Leonardo permanece no caminho de gravação. O firmware usa 65 registradores e transações BEGIN, SET e COMMIT. SAVE persiste em EEPROM com verificação de integridade. Identificação, centro, ARM, heartbeat e desarme formam o ciclo de operação da sessão.

O processamento de entradas converte direção, pedais, câmbio e matriz para eixos e botões HID. Os relatórios de FFB vindos do jogo alimentam o cálculo de força, que passa por ganhos, batentes, limites do perfil e comutação da ponte H. Esse fluxo explica por que uma leitura no aplicativo, um botão HID reconhecido e uma sensação de torque são evidências diferentes.

[[Projetos/Malth Pro/Documentacao/docs/PWM_BTS7960|PWM e ponte H]] · [[Projetos/Malth Pro/Documentacao/firmware/Leonardo/MalthProLeonardo/Controller.cpp|Implementação do controlador]] · [[Projetos/Malth Pro/Documentacao/desktop/device-protocol.cjs|Codificação de perfil]] · [[Projetos/Malth Pro/Documentacao/docs/ARCHITECTURE_TRACE|Rastreamento histórico anterior à migração HID]]

## Pedais, câmbio e matriz

**Pedais.** Mínimo captura a posição solta e Máximo a posição pressionada. Isso funciona com sensor cuja leitura cresce ou decresce no curso. A curva monotônica de dez pontos do freio é aplicada uma vez. A interface mostra bruto, calibrado e convertido. Em teste simulado, extremos 800 → 300 e leitura 550 produziram valor calibrado 511, depois 255 na curva escolhida. Pedais desabilitados têm saída HID zero. O ADC bruto pode continuar apresentando leitura, inclusive ruído, na telemetria.

**Câmbio H.** Na 1.3.7, áreas transparentes escondiam onde clicar, a classe de captura não tinha destaque visual, os quatro extremos editáveis não entravam no protocolo e Concluir apenas encerrava a edição. Na 1.3.8, a faixa de captura fica fora do mapa e indica cada posição registrada. Os extremos são leituras dos pontos capturados. Os oito pontos recalculam as três divisões X e duas Y, com neutro entre fileiras e rejeição de sobreposição. Os cinco limites seguem editáveis e são os enviados ao firmware. Concluir salva e aplica quando conectado. Cancelar ou trocar de modo durante a captura restaura os ajustes anteriores. Números e vistos foram removidos do mapa a pedido do usuário, com o indicador grande de marcha preservado.

**Sequencial.** Usa apenas o eixo Y. Os botões HID 25 e 26 enviam subir e reduzir, inclusive nos extremos do contador local. A prévia passa por R ↔ N ↔ 1…7 e requer retorno da alavanca ao centro para uma nova troca. O jogo determina sua marcha real e precisa associar os comandos. Na leitura do perfil local do ETS2, o arquivo salvo mostrava transmissão automática, associações de subir/reduzir no teclado e joystick vazio. A consulta foi somente leitura e não foi tomada como confirmação da configuração de outros perfis ou jogos.

**Matriz.** Varredura 4×4 com estabilização, 16 bits na telemetria e saída em botões HID. A visualização fica em Câmbio → Modo → Botões. O teste físico precisa conferir acionamento, soltura, correspondência de cada botão e combinações usadas na montagem.

[[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.2|Curva do freio e referências]] · [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.8|Calibração do câmbio e sequência R/N]]

## Force Feedback e investigação das desconexões

1. **Reconhecimento inicial.** O usuário viu o encoder mover a direção no Euro Truck. Logs mostraram que o jogo enumerava efeitos DirectInput. O indicador de controle conectado, por si só, também podia refletir a leitura do joystick. A sessão de configuração e habilitação do motor tinha verificação própria.
2. **Batentes e USB.** Forçar ou retornar do limite causava perda de resposta. A correção de batente 0.1.4 tratou resistência antecipada, mas a falha de comunicação reapareceu. A migração HID 0.1.5 foi verificada na placa com 466 estados em cerca de 15,5 s, com potência do motor desligada. A 0.1.6 permitiu observar força calculada, D8 e comparadores PWM na mesma condição.
3. **Comparação real.** Foi testado EMC Lite 0.932 na placa, com backup prévio de flash e EEPROM. O usuário relatou força no EMC e no batente local Malth. Relatou também ausência de FFB Malth no ETS2 durante aquele estágio. Os logs de enumeração e a leitura de estado não substituíam uma captura completa dos relatórios USB.
4. **Reset e direção.** O Reset 0.1.8 limpava o bit de atuadores habilitados. A 0.1.9 corrigiu a sequência, com verificação real Disable → Reset em USB e potência desligada. Depois de um giro brusco e desconexão, foi confirmada uma inconsistência de sinal de efeitos direcionais. A 0.1.10 passou a interpretar a direção como origem da força e a projetar corretamente o efeito no eixo X. Condições e batentes continuaram restauradores. O teste de inversão física dos fios foi desfeito pelo usuário.
5. **Efeitos rápidos.** A alternância de força podia reiniciar a espera antes de D8 habilitar. O defeito foi reproduzido em funções reais do firmware sob emulação. A tentativa 0.1.11 melhorou parte da lógica, mas o resultado na placa a 250 Hz ficou em 43 de 97 amostras habilitadas. Com a interrupção temporária do Timer1 na 0.1.12, foram 93 de 97. Os 11 tipos de efeito tiveram força calculada e PWM na placa com potência desligada. As contagens de amostras habilitadas representam cobertura de leitura, não duty elétrico medido.
6. **Sensação confirmada no ETS2.** Com 0.1.12, o usuário sentiu retorno e terreno. Em 180 s houve 2.910 amostras, 857 ativas, 23.119 relatórios adicionais e nenhum reinício, nova rejeição ou atraso longo na janela. No ETS2 observado, as sensações vinham misturadas em Constant Force. Os 18 controles do aplicativo foram rastreados até os 65 registradores e seus consumidores, com cobertura separada para os tipos de efeito.
7. **Colisão com motor energizado.** Depois desse ensaio, uma colisão voltou a desconectar a placa e travar o jogo. O registro mostrou timeout no PING às 19:14:34 de Brasília, timeout no HELLO e reconexão às 19:15:29. O tempo de funcionamento lido depois indicou reinício por volta de 19:15:27. A causa física ou de firmware permaneceu indeterminada.
8. **Comparação com os 12 V desligados.** O teste sintético válido fez 1.927 mudanças de força em 30 s, sem reinício ou novas rejeições. Na repetição da colisão real do ETS2 sem potência, o usuário confirmou que jogo e volante continuaram funcionando. Em 120 s houve 1.928 amostras, 905 ativas, força calculada de −2.499 a +2.499, nenhum reinício ou nova rejeição. O contador de relatórios saturou em 65.535, permitindo afirmar pelo menos 13.204 relatórios adicionais. A comparação associa a diferença ao cenário energizado, com variáveis de carga ainda em aberto.
9. **Medições e última notícia.** O usuário mediu 4,73 V no Leonardo e 4,72 V na lógica do BTS em repouso, com USB conectado e 12 V desligados. A diferença de 0,01 V nessa condição não registra transientes da colisão. Ele informou que o motor não tinha capacitor externo entre terminais. Foi indicada supressão cerâmica de 100 nF, com instalação e novo teste sob carga sem confirmação posterior. Em 04/11 o usuário informou FFB atualmente OK e continuará reportando durante o uso.

[[Projetos/Malth Pro/Documentacao/docs/BANCADA_HID_1.3.0|Primeiros ensaios HID]] · [[Projetos/Malth Pro/Documentacao/docs/FFB_CONTROL_AUDIT|Auditoria dos 18 controles]] · [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.6|Capturas e comparação de colisão]]

## Referências externas estudadas

REA identificou chamadas HID e partes legíveis do EMC Pro/Lite. Ghidra, ILSpy e emulação AVR ajudaram a comparar modos PWM, estrutura de entrada e relatórios. Corpos protegidos ou malformados do EMC Pro limitaram a análise. A reconstrução estática do Lite 0932 passou da importação ELF incorreta para a leitura da flash binária no endereço zero. O HEX separado FFBWheel 0.16 foi analisado estaticamente, com 202 funções exportadas. A análise do ZIP WheelConfig identificou recursos e executável, com o HEX fornecido separadamente.

AFFBWheel, Arduino-FFB-wheel e Arduino-FFB-gui foram consultados em revisões fixadas. O cálculo de envelopes e amplitude adaptou ideias do AFFBWheel, preservando o aviso da licença. Descritores, protocolo, temporização e pinagem foram conferidos contra o Malth Pro. A compatibilidade documental com jogos Windows serve para priorizar ensaios. O resultado físico com sensação registrado é do ETS2, dentro das condições acima.

[[Projetos/Malth Pro/Documentacao/docs/FFB_REFERENCE_REVIEW|Comparação de referências]] · [[Projetos/Malth Pro/Documentacao/docs/UPDATE_1.3.1|Análise EMC com REA, Ghidra e ILSpy]] · [[Projetos/Malth Pro/Documentacao/docs/GAME_COMPATIBILITY|Compatibilidade por jogo]] · [[Projetos/Malth Pro/Documentacao/firmware/THIRD_PARTY|Atribuições e licenças]]

## Verificação e próximos registros

| Evidência | O que foi observado |
| --- | --- |
| Node | Codificação de perfis, conexão, ajustes FFB e matemática de calibração. A rodada 1.3.8 incluiu quatro testes direcionados ao câmbio. |
| AVR emulado | Regressões de controle/PID, PWM, efeitos e comutação. A rodada 0.1.13 passou 149 verificações de controle. |
| Electron simulado | Layout, persistência, ajustes e eventos. O teste 1.3.8 capturou oito posições, salvou X 435/505/575 e Y 483/517, bloqueou conclusão incompleta e exibiu R. |
| Placa real com potência desligada | Comunicação, diagnósticos, gravações verificadas e resposta lógica de efeitos. Backups e comparação de EEPROM foram feitos nas gravações acompanhadas. |
| Bancada e jogo | Relatos do usuário e capturas nas condições registradas. O relato mais recente aprova câmbio, encoder e sequencial, com FFB funcionando durante o uso atual. |

As próximas validações declaradas pelo usuário são **pedais** e **matriz de botões**. Para completar o histórico quando houver resultados, registrar versão do aplicativo e do firmware, componente, condição de ensaio e comportamento observado. Ocorrências de FFB durante o uso entram junto da versão, jogo, situação e registro disponível, preservando a diferença entre sensação e estabilidade.

O instalador 1.3.8, o HEX 0.1.13 e o ZIP de fontes foram conferidos na entrega. O HEX contém 28.300 bytes de programa, com a região do bootloader fora da imagem. SHA-256: `7d7dad3a3da952ddaf67b2026ffa74c2d9e334df8eb825af076896e58a901b65`.

Os registros brutos da bancada ficam no workspace, em `firmware/build/`. Use estes nomes para recuperar a evidência original quando precisar comparar uma nova ocorrência:

| Registro | Conteúdo |
| --- | --- |
| `hid-all-effects-012.json` | Exercício dos 11 tipos de efeito com potência desligada. |
| `hid-012-ets2-physical-20261103191224.json` | Janela do ensaio em que o usuário sentiu retorno e terreno. |
| `connection-collision-012.log` | Sequência de perda de comunicação e recuperação na colisão energizada. |
| `hid-collision-stress-012.json` | Ensaio sintético válido com mudanças rápidas e potência desligada. |
| `hid-012-collision-poweroff-summary.json` | Resumo da colisão comparativa com os 12 V desligados. |
| `settings-137.png` e `shifter-calibration-138.png` | Prévias de Configurações e da calibração do câmbio. |

[[Projetos/Malth Pro/Entregas|Instalador, HEX e fontes]] · [[Projetos/Malth Pro/Graphify/graph.canvas|Canvas das relações]] · [[Projetos/Malth Pro|Nota principal e diário cronológico]]


## Revisão no Windows — 09/11/2026

Base recebida: MalthPro-CodigoFonte-1.4.0.zip, SHA256 8acce8a294fafc21a89bdd3cde49b67ac53f1a1647744c11af2111b9276d50e2. A revisão substitui o protótipo local 1.3.9/0.1.14, preservado em dist/backups. Versões de entrega: aplicativo 1.4.0 e firmware 0.2.0. Não houve instalação nem gravação nesta revisão; última gravação diretamente acompanhada: 0.1.12.

FFB recebe Enable/Disable/Pause pelo USB PID, sem depender do PING do aplicativo. O centro é estabelecido na placa ao iniciar ou por Centralizar. Sem aplicativo vale o perfil gravado na EEPROM. Batentes e efeito fora do jogo também respeitam USB, Pause/Disable e bloqueios locais.

Correções adicionais nesta revisão: abrir/reconectar o app preserva o perfil da placa, sem BEGIN automático; Salvar ou selecionar explicitamente um perfil aplica a configuração. O app não envia ARM automaticamente para firmware autônomo, respeitando Disable do jogo. Transações abandonadas expiram após 2 s sem comandos de configuração e são descartadas na perda de USB. Pacotes PID rejeitados não renovam o temporizador de atividade.

Validação de software no Windows: 34 testes Node; 32 verificações de sessão AVR com Controller.cpp real; 103 verificações de efeitos AVR, sem falhas. Teste de interface com conexão simulada confirmou abertura/reconexão sem reaplicação e Salvar aplicando perfil. Na base recebida também passaram 76 verificações de comutação, 93 PWM e 149 controle. USB e periféricos são simulados nesses ensaios; não comprovam funcionamento físico.

HEX recompilado no Windows: 28.528 bytes de 28.672, restando 144 bytes. SHA256 BCD78417CC6A1739DA2897D5209054907D00DCA60D9244A7F48322FB26748FBA. Pinagem preservada: enables juntos em D8, PWM D9/D10; nenhuma alteração física.

Limite de compatibilidade: a política recebida mantém Constant/Ramp/periódicos por 1,5 s sem relatório PID válido e reduz até zero aos 2 s. Isso também pode reduzir efeitos legítimos longos/infinitos de jogos que enviem poucos comandos; não demonstra travamento do jogo. Mola/amortecimento/fricção/inércia e batentes não usam esse esmaecimento. Compatibilidade com todos os jogos ainda não validada.

Watchdog de firmware e detecção de USB não equivalem a proteção elétrica de sobrecorrente: não há leitura de corrente implementada nesta montagem. A causa das falhas energizadas em colisões continua sem confirmação. Relato físico de 04/11: câmbio, encoder e sequencial aprovados; FFB então funcionando sob observação. Pedais e matriz pendentes. Firmware 0.2.0 ainda sem ensaio físico documentado.

Anotações pessoais do Obsidian preservadas; documentação, fontes individuais, notas legíveis e ZIP da entrega devem ser sincronizados após o empacotamento.


## Interface 1.4.1 — 14/11/2026

Tema claro e escuro em Configurações → Aparência, preferência local e fontes Barlow. Layout integrado com as correções de FFB da revisão Windows anterior. Alternância, persistência, contraste dos botões, três painéis sem rolagem em 1080 × 620 e perfil em conexão simulada verificados. 34 testes Node passaram. ZIP recebido preservado e fontes revisadas em ZIP próprio. [Revisão 1.4.1](UPDATE_1.4.1.md).


### Preparação para GitHub — 14/11/2026

O ZIP 1.4.1_2 corresponde ao código revisado e acrescenta documentação e script de empacotamento Linux. O instalador substituto e o HEX 0.2.0 foram conferidos por extração e separados como anexos da Release v1.4.1. Publicação e teste físico pendentes.
