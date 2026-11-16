# Malth Pro 1.4.0 / firmware 0.2.0 — FFB sem depender do aplicativo

Até a 1.3.8, o motor só funcionava enquanto o aplicativo estivesse aberto mandando PING a cada 500 ms. Se o aplicativo travasse, fosse fechado ou o Windows encerrasse o processo, o firmware desligava o FFB em 2 segundos, no meio da corrida.

Na 0.2.0 o firmware decide sozinho, do mesmo jeito que volantes comerciais e o OpenFFBoard: o **jogo** liga e desliga os atuadores pelo USB PID e o **aplicativo** serve só para configurar.

## Quando o motor pode funcionar

Uma única função (`motorAllowed()` em `Controller.cpp`) decide, no laço, na interrupção de comutação e no assentamento do PWM. O motor só funciona se todas as condições forem verdadeiras:

| Condição | O que significa |
| --- | --- |
| Centro válido | A posição ao ligar o Arduino é o centro. Muda só com Centralizar, ou fica inválido ao mudar CPR/INVERT. |
| USB configurado | Sem host, o motor desliga e os efeitos são apagados. |
| Atuadores habilitados | Começam habilitados; o jogo pode desabilitar e reabilitar (Device Control Disable/Enable/Reset). |
| Sem pausa | Device Control Pause do jogo. |
| Sem configuração em andamento | BEGIN…COMMIT e SAVE desligam o motor; ele volta sozinho ao terminar. |
| Sem corte manual | DISARM desliga até o próximo ARM. |
| Laço principal vivo | Mais de 20 ms sem atualização desliga (ISR do Timer3), além do watchdog de 250 ms. |

O que **não** desliga mais o motor: o aplicativo fechar, travar, parar de mandar PING, ou conectar no meio da corrida (HELLO não interrompe mais).

## Proteção nova: jogo travado

Sem o PING do aplicativo, um jogo que trava com uma força constante tocando continuaria empurrando o volante. Por isso, se o host fica sem mandar nenhum relatório PID:

- forças **ativas** (constante, rampa, senoidal, quadrada, triangular, dente de serra) ficam iguais até 1,5 s e somem linearmente até 2,0 s;
- **condições** (mola, amortecimento, atrito, inércia) continuam, porque só reagem ao movimento do volante;
- **batentes** e **Efeito fora do jogo** continuam sempre, mesmo sem jogo e sem aplicativo.

No ETS2 observado eram cerca de 130 relatórios por segundo, então um jogo funcionando nunca chega perto de 1,5 s em silêncio. Os tempos ficam em `EffectMath.h` (`ACTIVE_EFFECT_HOLD_MS`, `ACTIVE_EFFECT_FADE_MS`).

## Mudanças no aplicativo 1.4.0

- O HELLO do firmware anuncia `"ffbAuto":1`.
- Com esse firmware, fechar o aplicativo **não** manda DISARM.
- Ao conectar, o aplicativo **não recentraliza**: o COMMIT agora responde `"centered":1/0`, e o app só manda CENTER se a placa perdeu o centro (mudança de CPR ou INVERT). Assim, abrir o app com o volante virado no meio da corrida não muda o centro.
- Textos da interface atualizados: o perfil que vale com o app fechado é o **gravado** (Salvar).

## Compatibilidade

- App 1.4.0 com firmware antigo (0.1.x): funciona como antes (PING obrigatório, DISARM ao fechar).
- App 1.3.8 com firmware 0.2.0: funciona, mas o 1.3.8 manda DISARM ao fechar e o FFB fica cortado até abrir o app de novo. Atualize os dois.
- Protocolo, registradores (65), pinagem e EEPROM não mudaram; o perfil gravado continua válido.

## Verificação feita (sem hardware)

| Teste | Resultado |
| --- | --- |
| Controle/PID em AVR emulado | 149, 0 falhas (igual à 0.1.13) |
| PWM em AVR | 93, 0 falhas |
| Efeitos/protocolo em AVR | 101, 0 falhas (82 anteriores + 19 do esmaecimento) |
| Comutação/liberação do motor | 76, 0 falhas (74 + transação e gravação) |
| **Sessão completa sem aplicativo** (novo) | 28, 0 falhas — `Controller.cpp` real + `PIDReportHandler` real, sequência ETS2 |
| Node (desktop) | 34, 0 falhas (32 + 2 novos de ffbAuto) |
| HEX | 28.406 bytes de 28.672 (sobram 266); SRAM global 1.866 de 2.560 |

O teste de sessão (`node tests/run-avr-math.cjs --session`) cobre: batente sem app; força do ETS2 sem app; app conectando no meio da corrida sem cortar; 5 s sem PING com FFB ativo; jogo travado (força some em 1,5–2 s, batente continua); jogo voltando; Disable/Enable do jogo; DISARM/ARM; transação de configuração; perda e retorno do USB. Ele foi conferido com mutações: removendo o esmaecimento ou voltando a cortar o FFB no HELLO, o teste falha.

Nada disso testa motor, BTS7960 ou USB físico.

## Roteiro de bancada

Comece com intensidade baixa e mantenha o corte da fonte de 12 V à mão.

1. Grave `Malth Pro-v0.2.0.hex` com a fonte de 12 V desligada. Instale o app 1.4.0, conecte e clique em **Salvar** (o perfil gravado é o que vale sem o app).
2. **Feche o aplicativo.** Ligue os 12 V. Gire além do batente: a força deve se opor ao giro.
3. Abra o ETS2 com o app fechado: retorno e terreno devem funcionar.
4. Com o jogo rodando, abra o app: o FFB não deve piscar nem mudar o centro.
5. Feche o app com o jogo rodando: o FFB deve continuar.
6. Encerre o ETS2 pelo Gerenciador de Tarefas durante uma curva: a força deve sumir em até 2 s, sem tranco.

Registre cada passo com o modelo de registro de bancada (versões, fonte ligada/desligada, resultado).

## Limites conhecidos

- **Sobra pouca flash** (266 bytes). Recursos novos vão precisar de economia em outro lugar.
- **A força é retomada sozinha.** Depois de uma falha temporária (laço travado, USB voltando), ela volta sem esperar o app; antes, ficava travada até um ARM.
- **A causa dos reinícios em colisão continua em aberto.** Essa mudança não mexe nisso: a investigação elétrica continua sendo a prioridade.
- **Compilação no Linux.** O HEX foi compilado com avr-gcc 7.3 do Linux e o core de referência 1.8.8 (`build-firmware.sh`). Com o mesmo código, essa compilação reproduziu o 0.1.13 byte a byte, exceto `__malloc_margin` da avr-libc (32 contra 128). Esse valor só afeta as alocações dos construtores globais, que rodam na inicialização com a pilha ainda rasa. Para um HEX idêntico ao do Arduino CLI, recompile no Windows com `build-firmware.ps1`.


## Revisão no Windows — 09/11/2026

Base recebida: MalthPro-CodigoFonte-1.4.0.zip, SHA256 8acce8a294fafc21a89bdd3cde49b67ac53f1a1647744c11af2111b9276d50e2. A revisão substitui o protótipo local 1.3.9/0.1.14, preservado em dist/backups. Versões de entrega: aplicativo 1.4.0 e firmware 0.2.0. Não houve instalação nem gravação nesta revisão; última gravação diretamente acompanhada: 0.1.12.

FFB recebe Enable/Disable/Pause pelo USB PID, sem depender do PING do aplicativo. O centro é estabelecido na placa ao iniciar ou por Centralizar. Sem aplicativo vale o perfil gravado na EEPROM. Batentes e efeito fora do jogo também respeitam USB, Pause/Disable e bloqueios locais.

Correções adicionais nesta revisão: abrir/reconectar o app preserva o perfil da placa, sem BEGIN automático; Salvar ou selecionar explicitamente um perfil aplica a configuração. O app não envia ARM automaticamente para firmware autônomo, respeitando Disable do jogo. Transações abandonadas expiram após 2 s sem comandos de configuração e são descartadas na perda de USB. Pacotes PID rejeitados não renovam o temporizador de atividade.

Validação de software no Windows: 34 testes Node; 32 verificações de sessão AVR com Controller.cpp real; 103 verificações de efeitos AVR, sem falhas. Teste de interface com conexão simulada confirmou abertura/reconexão sem reaplicação e Salvar aplicando perfil. Na base recebida também passaram 76 verificações de comutação, 93 PWM e 149 controle. USB e periféricos são simulados nesses ensaios; não comprovam funcionamento físico.

HEX recompilado no Windows: 28.528 bytes de 28.672, restando 144 bytes. SHA256 BCD78417CC6A1739DA2897D5209054907D00DCA60D9244A7F48322FB26748FBA. Pinagem preservada: enables juntos em D8, PWM D9/D10; nenhuma alteração física.

Limite de compatibilidade: a política recebida mantém Constant/Ramp/periódicos por 1,5 s sem relatório PID válido e reduz até zero aos 2 s. Isso também pode reduzir efeitos legítimos longos/infinitos de jogos que enviem poucos comandos; não demonstra travamento do jogo. Mola/amortecimento/fricção/inércia e batentes não usam esse esmaecimento. Compatibilidade com todos os jogos ainda não validada.

Watchdog de firmware e detecção de USB não equivalem a proteção elétrica de sobrecorrente: não há leitura de corrente implementada nesta montagem. A causa das falhas energizadas em colisões continua sem confirmação. Relato físico de 04/11: câmbio, encoder e sequencial aprovados; FFB então funcionando sob observação. Pedais e matriz pendentes. Firmware 0.2.0 ainda sem ensaio físico documentado.

Anotações pessoais do Obsidian preservadas; documentação, fontes individuais, notas legíveis e ZIP da entrega devem ser sincronizados após o empacotamento.
