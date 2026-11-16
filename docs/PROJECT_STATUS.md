# Estado do Malth Pro

Atualizado em 14/11/2026.

## Versoes

- Aplicativo Windows: fontes 1.4.1 com tema claro e escuro. Instalador 1.4.1 conferido por extração, sem assinatura digital. Janela 1080 × 620.
- Firmware: 0.2.0 recompilado no Windows, não gravado nesta revisão; 0.1.12 é a última gravação diretamente confirmada. Protocolo2/HID.
- Histórico de bancada 0.1.12: retorno e terreno confirmados, mas colisão posterior
  causou desconexão/travamento do ETS2; reinício da placa observado.
  Causa não determinada; estabilidade NÃO resolvida. Fonte12V desligada.
  Ensaio sem potência:1927 mudanças de força/30s, sem rejeição/overrun/reset.
  Histórico do ensaio tátil anterior: usuário confirmou retorno e terreno no ETS2.
  Leitura180s/2910amostras857ativas,zero rejeição/overrun/reinício;
  mínimo5/máximo25 escolhidos pelo usuário.11tipos lidos sem potência,
  18ajustes auditados. ATS,demais funções físicas e estabilidade longa pendentes.
  Histórico de giros/quedas e correções preservado em UPDATE_1.3.5/1.3.6.md.
- Interface localizada em `malth-control/`.

## Implementado

- Configuração e heartbeat por HID Feature Reports; aplicativo não abre COM.
  Requer par aplicativo1.3.0/firmware0.1.5. Relatórios PID do volante preservados.


- Batentes sem antecipar o ângulo no firmware0.1.4: 900° = ±450° e 1080° = ±540°.
  Dentro do curso somente efeitos de jogo/desktop; batentes progressivos fora dele.

- Contorno original do ícone do cabeçalho preservado ao trocar a cor do tema.

- Histórico 1.2.9: recuperação de sessão serial perdida sem remoção da COM; instância única do
  aplicativo; última falha visível e registro local do erro USB original.
  Não comprova correção de queda elétrica/USB sob carga: ver `UPDATE_1.2.9.md`.

- Volante com encoder incremental e angulo de 30 a 1080 graus.
- Calibracao Minimo/Maximo dos pedais e curva de freio de dez pontos.
- Cambio H-Shifter ou sequencial, com mapa e leitura ao vivo.
- Matriz 4x4 habilitada no firmware, acessivel em Cambio > Modo > Botoes,
  com 16 indicadores compactos ao vivo, sem aba separada.
  O firmware 0.1.2 transmite os botoes na telemetria USB serial; o HID conserva
  o mapeamento dos botoes 1..16 para os jogos.
- Perfis locais, importacao/exportacao JSON e gravacao confirmada na EEPROM.
- Aba Configurações com três painéis verticais, roda de cor/Intensidade e PNG pessoal
  do volante. Preferências visuais locais, independentes do Arduino e dos perfis.
- Seleção Padrão/Scania/Fórmula1/PNG externo conferida em Electron.
- Calibração Hall crescente/decrescente e prévia da curva de freio ao vivo.
- Efeitos com envelope, pausa e início atrasado revisados em0.1.8.
- Presets de intensidade FFB 10..100% e Manual, sem alterar os limites manuais de força mínima/máxima.
- Receptor USB HID PID para efeitos de Force Feedback.
- Saida BTS7960 em D8/D9/D10, modo padrao 2 PWM + 1 DIR.
- Alternativa 1 PWM + 1 DIR adaptada aos mesmos fios; modelo BTS fixo,
  modos com 2 DIR indisponiveis por exigirem outra ligacao. Indice Z removido da interface.
- Habilitacao automatica do FFB apos conectar e aplicar o perfil; posicao inicial
  usada como centro. Centralizar corrige a referencia e retoma a forca.
- Conexão automática no primeiro uso e nas reconexões; último perfil selecionado
  restaurado ao abrir. Troca de perfil aplica valores salvos automaticamente.
- Esc e Desconectar removidos da interface por solicitação do usuário.
- Força mínima/máxima de 0 a 100% definidas pelo perfil, sem teto fixo de bancada.
- Watchdogs e desarme por perda de comunicação/USB preservados.
- A imagem usa a direcao ja invertida pelo firmware, sem inverter novamente.
- Alterar CPR ou inversao invalida o centro tambem na sessao do aplicativo;
  a centralizacao e confirmada antes de retomar a forca. Na revisão 1.2.4, Esc impedia
  a retomada automatica ate uma centralizacao solicitada pelo usuario.
- O envio usa uma copia do perfil; falhas de confirmacao invalidam o estado
  local de centralizacao antes de uma nova tentativa.

## Hardware

Arduino Leonardo, ATmega32U4, 16 MHz / 5 V; BTS7960 e um motor DC.
Encoder A/B em D0/D1, pedais em A0..A3 e cambio em A4/A5.
O indice Z nao esta ligado. A matriz de botoes 4x4 permanece prevista no firmware.

## Validacao

Revisão1.3.3/0.1.9:68 verificações efeitos e142 controle/PID AVR aprovadas;
Disable/Reset na placa confirmou20→22 após Reset e força zero, sem efeitos.
27776 bytes gravados/verificados, EEPROM idêntica. Isso não valida torque
no jogo nem comprova solução da desalocação observada durante ETS2.


Revisão1.3.2/0.1.8:25 testes Node,142 verificações controle/PID AVR,63 de
efeitos/freio AVR e93 de PWM aprovados; interface Electron com comunicação
simulada aprovada. HEX27736 bytes e SRAM global1848 bytes, sem contar pilha.
Não houve gravação, teste de motor/pedais ou novo teste ETS2 nesta rodada.
Usuário confirmou R_EN/L_EN unidos no D8; emulação do HEX EMC0932 demonstrou
que modos2DIR usam D8/D11 separados e não são compatíveis com essa ligação.
Mantidos dois modos adaptados à montagem, sem alteração de pinagem.


O usuario confirmou conexao com o Leonardo e leitura dos pedais/cambio.
Testes anteriores de comunicacao, interface e calculos em emulacao AVR foram
realizados. A resposta fisica do motor, sentido/ganho, latencia e estabilidade
nos jogos ainda aguardam validacao. Na 1.2.9, 20 testes Node e a suite Electron
de reconexao/interface passaram com comunicacao simulada. O usuario relatou
FFB ativo, mas perda de resposta ao forcar o batente, sem som de USB desconectando;
a causa fisica ou logica ainda nao foi reproduzida. Na revisao 0.1.3 anterior,
93 verificacoes PWM em AVR passaram; firmware/HEX preservados nesta rodada.
O roteiro de bancada esta em
`docs/UPDATE_1.2.5.md` e `docs/PWM_BTS7960.md`.

Na inspeção seguinte da 1.2.9 instalada, o registro identificou firmware 0.1.3,
timeout de PING e depois recusa de abertura da COM4 pelo Windows. Interfaces
PnP continuavam OK. Fechar e reabrir o app com a fonte do motor desligada não
recuperou a porta; reinício USB via PnPUtil recusado por privilégio administrativo.
Isso não comprova causa elétrica nem que outro programa ocupava a porta.
Veja `docs/UPDATE_1.2.10.md`. Revisão 1.2.10 altera somente o contorno/versão/docs.

Após retirar/recolocar USB com fonte do motor desligada, COM4 foi recuperada,
firmware0.1.3 identificado e perfil aplicado no app1.2.9 instalado. Usuário
confirmou movimento normal na faixa problemática sem potência; observação
de 136 segundos sem novas falhas no registro. Fonte/ruído/firmware sob carga
ainda não separados. Tema rosa, Scania e 900° reapareceram; suspeita anterior
de perda de preferências não confirmada nesta nova abertura.

Revisão1.2.11/0.1.4: antecipação de batente confirmada no código e corrigida;
108 verificações de controle/batentes, 93 de PWM em AVR e 20 testes Node
aprovados. Novo HEX compilado, não gravado. Ver `docs/UPDATE_1.2.11.md`.

## Organizacao para backup

Os caminhos dos scripts sao relativos ao projeto ou usam locais padrao do
sistema. O pacote de codigo-fonte inclui README, imagem, interface, aplicativo,
firmware, scripts e avisos das bibliotecas utilizadas. Dependencias instaladas,
compiladores e saidas de compilacao sao gerados localmente.


## Revisão 1.3.0 / 0.1.5

Usuário confirmou falha no batente também com0.1.4 e autorizou testes de motor.
Depois confirmou fonte desligada; mudou o cabo de porta do PC. Logs mostraram
ReadIOCompletion/GetOverlappedResult Operation aborted e timeoutPING antes
da recusa de abertura COM. REA confirmou declarações de HidD_Set/GetFeature
no EMC Lite; corpos protegidos impedem reconstrução completa.
Transporte HID próprio implementado, sem CDC no fluxo de configuração.
Bootloader identificadoCOM3 após RESET físico do usuário;27184bytes gravados
e verificados. Primeira leitura real por HID:466estados/15,493s, zero falhas
e overruns, motor desarmado. Resultado sob potência continua em investigação.

1.3.4: acelerador/freio opcionais e atalho de centralização em Configurações.27testesNode e UI mock aprovados; sem novo teste físico ou flash.

1.3.5: Configurações em três colunas/trilho de intensidade uniforme. ETS2 girou bruscamente e placa reiniciou sob acionamento; troca de terminais tornou batente instável e foi desfeita com fonte desligada. FFB físico/USB sob carga ainda não resolvidos. Ver UPDATE_1.3.5.md.

0.1.10: conversão origem DirectInput→força aplicada, sem inverter condições/batentes.82efeitos/142controleAVR e polaridade na placa sem potência aprovados; flash/EEPROM verificados. Leitura90s de jogo com fonteOFF estável; novo teste energizado pendente.

Usuário não aprovou resposta FFB após0.1.10:sem terreno/buracos perceptíveis. Captura180s sem reset/rejeição, mas saída PWM não valida sensação. Comparação REA Pro/HEXFFBWheel0.16 em andamento.

1.3.6/0.1.12:Timer1overflow durante comutação,74AVRruntime93PWM82efeitos142controle e28Node aprovados.11tipos/250Hz lidos na placa sem potência, sem rejeições; avaliação tátilETS2 pendente. Veja FFB_CONTROL_AUDIT.md.

Confirmação final0.1.12: usuário “Senti retorno e terreno” no ETS2; ver UPDATE_1.3.6.md.


### Falha posterior em colisão —0.1.12,03/11/2026

Após confirmar retorno e terreno, o usuário relatou colisão no ETS2: força maior, perda de comunicação e jogo travado. A aprovação tátil anterior permanece histórica, mas a estabilidade sob colisão FALHOU; não considerar a versão solução concluída.

connection.log:19:14:34.804(Brasília) PING ACK_TIMEOUT;19:15:22.683 HELLO ACK_TIMEOUT;19:15:29.247 reconexão0.1.12. Fonte12V desligada/USB mantido confirmados pelo usuário. Leitura passiva às19:18:29.767:uptime182449ms, indicando inicialização perto19:15:27;129amostras estáveis,força0,D8baixo,zero rejeições/overruns após reinício. Windows lista interfacesHID eCOM13 OK. Nenhum eventoUSB/PnP pertinente encontrado na consultaSystem20min. Causa do reinício NÃO determinada: não atribuir automaticamente a fiação, fonte, ruído ou firmware.

Ensaio lógico de mudanças abruptas, com fonteOFF e jogo encerrado:1927atualizações/30s,484amostras,força−4998..4998,zero rejeições/overruns/reset. Primeiro ensaio foi inválido por ausência de espera apósReset antesCreate, gerou rejeições e força0; descartado como evidência de saída, script corrigido com espera e verificação de playing/cobertura. Nenhum perfil/EEPROM/firmware/pinagem alterado. Esse ensaio não reproduz corrente, carga mecânica nem os pacotes exatos da colisão. Não prova que hardware é a causa. Registros preservados em firmware/build/connection-collision-012.log, hid-012-positive-before-collision.json e hid-collision-stress-012.json. Necessária captura contínua antes/durante a falha para distinguir travamento/reset e verificar alimentação/USB sob carga. Não solicitar nova colisão energizada agora.

Instalador1.3.6 foi gerado antes desta nova falha; não instalado, não apresentar como correção da desconexão. Firmware0.1.12 permanece gravado. ETS2 parcialmente aprovado para sensação; estabilidade reaberta. ATS/outros jogos pendentes.


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
