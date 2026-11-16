# Bancada HID do Malth Pro 1.3.0

Registro de 02/11/2026, horário de Brasília. Diagnóstico em andamento; nenhuma
conclusão de estabilidade sob carga deve ser inferida deste documento.

## Firmware de diagnóstico 0.1.6

Após a migração para HID, o usuário relatou conexão normal, mas ausência de
força, inclusive ao selecionar Mola em 10%. Foi adicionado o Feature Report
0x41, independente da fila de configuração 0x40. Ele permite ler força
calculada, posição, meia faixa, estado PID, habilitação, registradores PWM,
modo, ajustes e contadores do controle. A leitura não envia torque ou perfil.

A pinagem e o acionamento do BTS foram preservados: D8 habilitação comum,
D9/D10 PWM. O firmware 0.1.6 foi gravado com alimentação de potência desligada;
HELLO e o novo diagnóstico confirmaram a versão em execução. O reset de upload
a 1200 baud funcionou automaticamente nesta atualização.

O usuário movimentou o volante para os dois lados com a fonte desligada.
No registro de 90 segundos, Mola 10%, mínimo 0 e máximo 25, a força calculada
atingiu aproximadamente 505/10000. Os comparadores PWM acompanharam a força,
alternando o canal por sentido, com D8 habilitado nas amostras de saída ativa.
ICR1=999, frequência configurada 16 kHz, CPR=1600, PID habilitado e sem pausa;
contador de atrasos longos permaneceu zero. Isso confirma cálculo e estado dos
registradores, sem medir a tensão nos fios nem provar torque mecânico.

Mola 10% gera força proporcional à posição, portanto não significa 10% de
saída constante. O teste não isolou a causa da ausência de força. A comparação
energizada com EMC permanece necessária.

## Comparação com EMC Lite 0.932

O usuário instalou o EMC Lite e indicou o arquivo EMCLite0932.hex. O SHA-256
coincide com a referência já analisada:
9F04AEB8B6AA28F113B9D9AA96E4F9D01F4EFB09CF23DA80303F8E0866BCC03A.
Checksums Intel HEX e área de aplicação Leonardo conferidos: 20.140 bytes.

Com a fonte desligada, foram salvos os 1024 bytes de EEPROM e os 32768 bytes
de flash anteriores antes de substituir a aplicação. O bootloader COM3 gravou
o EMC e verificou por leitura de volta os 20.140 bytes. As cópias de recuperação
permanecem em firmware/build, excluídas da distribuição de fontes.

O Windows enumerou EMC Dev / EMC, VID 0013, PID 1984, usage page 1, usage 4.
A interface mostrou firmware 0.932 e modo 2PWM + 1DIR. Inicialmente CPR era zero;
o usuário confirmou ajustar para 1600 e salvar mantendo a fonte desligada.
Foi solicitado teste temporário de curso 900° e Softlock 25%, sem insistir no
batente. Resultado desse teste ainda pendente neste registro.

O controle remoto conseguiu ler a tela, mas falhou em ações com as mensagens
“foreground window did not report a process id” e “user input was detected”.
Os ajustes posteriores foram pedidos ao usuário; não atribuir esses cliques
ao agente. Não há captura elétrica ou captura dos pacotes USB desta sessão.

## Modos de ponte H

A análise estática anterior comprovou quatro modos nativos no mesmo HEX do
EMC Lite. Seleção por software não exige trocar de firmware a cada modo.
O Malth implementa atualmente dois comportamentos compatíveis com a ligação
fixa do BTS. Os modos de duas direções permanecem indisponíveis porque exigem
implementação e ligação apropriadas, incluindo D11 na referência EMC.
Não confundir índice visual com ID nativo, nem liberar só os rótulos.

## Interface em desenvolvimento

Configurações agora oferece modelos Padrão e Scania, além de PNG externo.
A imagem Scania foi recuperada do PNG já escolhido pelo usuário. Alternar
modelos preserva o arquivo externo salvo; ao atualizar, o PNG personalizado
anterior continua selecionado. Modelo F1 fica para uma imagem futura.

Conferência Electron com comunicação simulada aprovou seleção, carregamento
da imagem Scania, persistência ao reabrir e retorno ao PNG externo. A mudança
visual não envia comandos ou perfis ao Arduino. Esses novos controles ainda
não integram o instalador 1.3.0 já gerado; próxima entrega prevista 1.3.1.

## Pendências

- Obter o resultado do batente/retorno com EMC energizado.
- Restaurar firmware e EEPROM Malth após a comparação, com a fonte desligada.
- Isolar a causa da falta de torque e validar batente/retorno sob potência.
- Gerar a próxima versão com fontes, instalador e HEX correspondentes.

## Atualização do usuário — 03/11/2026

O usuário confirmou que o EMC fez força no teste solicitado. Depois relatou
que continuou testando com firmware Malth: batente com força e sem perda de
comunicação nesse ensaio. No ETS2, porém, não obteve FFB, enquanto EMC funcionou.
Confirmou explicitamente que o teste de batente Malth usava firmware Malth.
O Arduino estava desconectado ao comunicar o novo problema.

O registro de conexão confirmou firmware0.1.6 e o registro do ETS2 reconheceu
Malth Pro e efeitos disponíveis, com FFB habilitado no perfil. Não havia captura
dos relatórios PID do jogo. A revisão0.1.7/1.3.1 trata a declaração do atuador e
a projeção de força; ver UPDATE_1.3.1.md. Ela ainda não foi gravada/testada em jogo.
