# Malth Pro 1.4.1 — interface com tema claro e escuro

Revisão das fontes em 14/11/2026. O seletor fica em **Configurações → Aparência**. A área de trabalho começa no tema claro. A preferência é gravada neste computador e restaurada ao abrir o aplicativo. A cor de destaque continua ajustável separadamente. O layout recebido usa navegação lateral, mantém os três painéis de Configurações e inclui fontes Barlow locais sob a licença OFL.

O ZIP recebido tinha versões anteriores de trechos de comunicação e do firmware. A integração aplicou o layout e o seletor de tema sobre a revisão Windows da 1.4.0. O aplicativo preserva perfil e centro da placa ao abrir ou reconectar no modo autônomo. Salvar aplica e grava o perfil. O aplicativo respeita o Disable do jogo. O firmware 0.2.0 recompilado na revisão anterior continua incluindo o descarte de transações abandonadas, o cancelamento de transações na perda de USB e a renovação do temporizador de força somente após validação do pacote PID.

Foi removida a transição da cor de fundo dos botões durante a troca para evitar texto claro sobre fundo claro no tema escuro. Foram verificados em Electron os dois temas, sua persistência após recarga, as fontes locais, o layout em 1080 × 620 com zoom de 120% e o perfil da placa em conexão simulada. Os 34 testes Node passaram. A validação física permanece pendente.

## Instalador Windows

O instalador `Malth Pro v1.4.1.exe` foi compilado no Linux e está sem assinatura digital. O SHA-256 é `49ead9b2eef07dad7603855f5d1ffde54aebfdafa0521c78d806ede5fda0d573`. A conferência por extração confirmou a interface, os módulos do aplicativo e o HEX 0.2.0 incluído. Use este hash para identificar o instalador revisado entre builds com o mesmo nome.

Para compilar no Windows, consulte o [guia do aplicativo](../desktop/README.md). O script `desktop/scripts/package-windows-linux.cjs` também permite gerar o instalador sem assinatura em Linux com Wine e `rcedit`.
