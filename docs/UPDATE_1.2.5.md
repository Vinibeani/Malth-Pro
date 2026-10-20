# Malth Pro 1.2.5 — matriz de botoes e angulo

20/10/2026.

## Interface

- Angulo ajustavel de 30 a 1080 graus na tela Principal.
- A matriz fica na tela Cambio, selecionando Modo > Botoes, junto das opcoes
  Sequencial e H-Shifter. A aba separada foi removida na revisao desta entrega.
- Grade 4x4 de indicadores circulares compactos, numerados de 1 a 16. Cada um
  acende em azul enquanto o botao fisico estiver pressionado; o painel lateral
  mostra quantos estao ativos. Ao perder a leitura, os indicadores sao liberados.
- Visual escuro, contornos discretos, tipografia e azul da interface existente.
- Versao v1.2.5 no canto inferior direito; mensagem fixa Salvo localmente removida.
- Ao salvar, a confirmacao exibe somente Salvo.
- A visualizacao somente exibe as entradas fisicas; clicar nos indicadores nao envia
  pressionamentos artificiais ao jogo.
- Selecionar Botoes muda a visualizacao e preserva o ultimo modo fisico de cambio
  (H-Shifter ou sequencial). Matriz e cambio continuam funcionando nos jogos.
- Perfis antigos salvos ou importados acima de 1080 graus sao limitados a 1080,
  preservando seus outros ajustes.
- Modelo BTS7960 fixo e Modo como seletor. Disponiveis 2PWM + 1DIR (padrao)
  e 1PWM + 1DIR adaptado aos mesmos fios. Modos com 2DIR exigem outra ligacao.
- Opcao Indice Z removida; o encoder usa apenas A/B.
- Legendas do mapa e campos do cambio abreviadas: Y min, Y max, X min e X max.
- Botao de lapis ao lado do seletor para renomear o perfil, inclusive o Padrao.
  Nome de ate 48 caracteres, salvo localmente sem alterar ajustes pendentes
  ou reenviar comandos ao motor. Cancelar preserva o nome anterior.
- O quadrado vermelho foi substituido pelo icone de lixeira, sem texto ao lado.

## Firmware Leonardo 0.1.2

- A matriz permanece habilitada; os botoes 1 a 16 continuam no mesmo relatorio
  HID. A nova telemetria serial inclui `buttons`, mascara de 16 bits.
- O firmware rejeita novos perfis com angulo acima de 1080 graus.
- Uma configuracao antiga da EEPROM com CRC valido e angulo de ate 2160 graus
  tem apenas o angulo limitado a 1080 ao carregar, preservando os demais ajustes.
- Protocolo serial 2 e 65 registradores mantidos. FFB, pinos, debounce e watchdogs
  preservados, assim como o limite de bancada de 25%.
- Novo modo de saida BTS PWM/DIR (registro 4), anunciado na identificacao USB
  serial. O modo anterior continua no registro 2. O aplicativo impede envio
  do modo novo a firmwares antigos.
- Saida preparada com D8 baixo por dois periodos de PWM em partida e troca
  de polaridade/modo. Comparadores arredondados para respeitar o teto de 25%.
- Detalhes e roteiro de bancada em `docs/PWM_BTS7960.md`.

## Instalacao

1. Fechar a versao anterior e instalar `Malth Pro Setup 1.2.5.exe`.
2. Gravar `firmware/releases/MalthPro-Leonardo-v0.1.2.hex` no Leonardo pelo
   procedimento documentado no README, mantendo a potencia do motor desligada.
3. Abrir o aplicativo, conectar o Leonardo e salvar o perfil desejado.
4. Abrir Cambio, selecionar Botoes no campo Modo e pressionar os botoes fisicos.

O firmware anterior ainda pode fornecer os botoes pela leitura HID quando o
Windows o expoe como controle Malth Pro. Para receber a matriz diretamente pela
telemetria e aplicar tambem o limite no Arduino, use o HEX 0.1.2.

## Pinagem da matriz mantida

- Colunas, nesta ordem: D12, D7, D6, D5.
- Linhas, nesta ordem: D4, D14, D15, D16. No Leonardo, 14/15/16 correspondem ao ICSP.
- Numeracao: linha 1 = botoes 1..4; linha 2 = 5..8; linha 3 = 9..12; linha 4 = 13..16.
- As entradas usam pull-up e podem ficar sem botoes conectados. Para multiplos
  pressionamentos independentes, a matriz fisica precisa tratar ghosting; o
  firmware nao consegue eliminar ambiguidades eletricas de uma matriz sem diodos.

## Bancada pendente

- Confirmar os 16 botoes individualmente e sua numeracao no Windows/jogo.
- Confirmar acendimento e soltura na interface, inclusive o botao 16.
- Desconectar o USB com botao pressionado e conferir que nenhum fica aceso.
- Conferir pressionamentos simultaneos conforme a montagem da matriz.
- Conferir que o angulo nao ultrapassa 1080 graus, inclusive com perfis antigos.
- Validar pedais, ambos os modos de cambio, centralizacao e resposta fisica do FFB.

Compilacao e empacotamento nao substituem testes fisicos. Foram aprovadas
78 verificacoes de calculos PWM em emulacao AVR e quatro testes do protocolo
PWM no PC. Nao houve gravacao no Arduino nem acionamento do motor.

Imagem compilada: 27014 bytes de programa (limite do sketch Leonardo: 28672)
e 1830 bytes de variaveis globais, de 2560 bytes de SRAM. Essa contagem nao
inclui o consumo dinamico do descritor HID nem a pilha durante a execucao.
