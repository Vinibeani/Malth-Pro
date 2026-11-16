# Malth Pro 1.2.9 — recuperação e diagnóstico USB

02/11/2026. Firmware permanece 0.1.3; nenhum HEX novo nesta revisão.

## Problema relatado e evidências

Usuário relata FFB funcionando, mas perda de resposta ao forçar o volante além
do batente, seguida de mensagem de porta ocupada/sem permissão. Reconectar o
cabo restaura o funcionamento. Foto atual mostra transmissão por correia e
montagem na base; não certifica fiação, supressão elétrica ou tensões sob carga.
Motor 775 12 V e fonte 12 V / 30 A são dados informados pelo usuário.

Inspeção local: instalado 1.2.8; main/preload/protocolo iguais às fontes antes
da alteração. Leonardo VID 2341/PID 8036, COM4 e interfaces HID com status OK.
Diagnóstico do aplicativo conectado com FFB habilitado. Nenhuma outra janela
do Malth Pro e nenhum processo EMC, Arduino IDE ou jogo dentre os nomes
consultados. Quatro processos Electron são compatíveis com uma única instância;
a inspeção não prova exclusividade da porta por todo o sistema.
Consulta dos eventos System de USB/PnP nas cinco horas anteriores sem resultados
correspondentes; ausência de eventos não exclui reinicialização ou falha USB.
Não havia registro próprio da falha original. Versão gravada no Arduino não
foi consultada via serial. Usuário inicialmente não havia reparado e depois
confirmou que não há som de USB desconectando; reinício de LEDs não confirmado.
Isso não prova que a interface CDC permaneceu operacional, nem identifica
isoladamente a origem elétrica ou lógica da falha.

## Correções

- `HELLO_REQUIRED` invalida a sessão local, cancela operações pendentes e fecha
  a porta, permitindo que a descoberta automática refaça HELLO, perfil salvo,
  CENTER e ARM. Antes, esse erro era rejeitado pelo heartbeat sem invalidar a
  conexão, deixando a interface conectada sem sessão funcional.
- Porta que conclui abertura depois de uma falha também é fechada. Mensagens
  recebidas depois de encerrar a sessão são ignoradas.
- Uma segunda execução traz a janela existente, evitando disputa entre duas
  instâncias novas. Outros programas ainda podem ocupar a COM.
- Erro de acesso durante comunicação passa a ser descrito como interrupção
  USB. Recusa ao abrir distingue ocupação possível de recuperação após queda.
  Não atribui automaticamente o problema a outro programa.
- Última falha fica visível no diagnóstico VOLANTE durante a sessão do app.
  Eventos, horário, operação, firmware identificado e erro original ficam em
  `%APPDATA%/Malth Pro/connection.log`. Rotação em 128 KiB, um arquivo anterior;
  sem perfis, posições de volante/pedais ou registro contínuo de telemetria.

Força mínima/máxima e ganhos seguem o perfil escolhido. Sem teto de 25%.
Watchdogs preservados; reconexão não garante recuperar dispositivo travado no
Windows ou eliminar perturbação elétrica. A posição ao reconectar continua
sendo o centro, conforme comportamento anterior do encoder sem Z.

## Validação

20 testes Node aprovados: sessão perdida com COM presente, cancelamento de
PING pendente, erro ReadFile, reabertura na mesma COM, abertura tardia, instância
única, preservação de causa/rotação do registro e regressões de protocolo/PWM.
Teste Electron oculto com IPC simulado aprovado: perfil salvo na reconexão,
última falha visível, rascunho preservado, cores/PNG/presets e ícone sem comandos.
Nenhuma porta real aberta, comando de motor enviado, firmware gravado ou
instalação realizada pelo agente. Falha sob carga não reproduzida nesta rodada.

## Hipóteses físicas ainda abertas

Interferência de escovas, queda de alimentação, retorno de potência/terra,
cabo/conector USB e travamento de firmware/driver ainda precisam ser separados
por observação/medição. Alimentação nominal 12 V / 30 A não mede transitórios.
A Pololu documenta reinícios de controladores por ruído de motores e recomenda
separar fios de potência/sinal, encurtar/torcer fios do motor e supressão adequada:
https://www.pololu.com/docs/0J15/9 . A Arduino recomenda conferir alimentação,
cabo e porta USB em placas instáveis:
https://support.arduino.cc/hc/en-us/articles/360016420160-If-your-board-is-unresponsive-stuck-resetting-or-otherwise-not-working-as-expected .
São orientações gerais; não comprovam a causa desta bancada. Não alterar fiação
ou acrescentar componentes com a fonte ligada. Sem ensaio de torque remoto.
