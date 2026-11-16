# Malth Pro 1.2.10 — contorno original do ícone

02/11/2026. Firmware 0.1.3 preservado.

## Alteração solicitada

Contorno do ícone M no cabeçalho fixado na cor original #13799a. Antes usava
`var(--cyan-dark)` e acompanhava a roda de cores. Todos os demais destaques
continuam acompanhando a preferência do usuário. PNG do ícone preservado.
Sem mudanças de valores salvos, força, protocolo, firmware ou reconexão.

## Diagnóstico USB da versão 1.2.9 instalada

O registro local mostrou a sequência real (horários de Brasília):

- 19:25:53: HELLO identificado em COM4, firmware 0.1.3.
- 19:26:33: ACK_TIMEOUT no PING; Arduino não confirmou a conexão.
- 19:26:35 e 19:26:51: tentativa de reabrir COM4 recusada: Access denied.
- 19:27:07: nova abertura iniciada sem conclusão registrada antes de encerrar
  o aplicativo às 19:29:44.

Primeira falha foi ausência de resposta; a recusa de abertura veio depois.
Isso não prova que outro aplicativo tomou a porta nem identifica a origem do
travamento. COM4, USB composto e HID continuavam presentes com status PnP OK.
Uma instância principal do Malth Pro 1.2.9 com processos filhos Electron
identificada; sem EMC/Arduino IDE dentre os processos consultados.

Usuário confirmou fonte de potência do motor desligada e USB mantido.
O agente fechou e reabriu somente o aplicativo 1.2.9 instalado; novas tentativas
de abertura continuaram recusadas. PnPUtil /restart-device direcionado somente
ao Leonardo foi recusado pelo Windows com Acesso negado; não houve reinício
do dispositivo. Nenhum flash ou teste de torque. Foi solicitado reconectar
fisicamente o USB mantendo a fonte desligada para verificar recuperação.

Fechar/reabrir app usa o fluxo automático, que pode enviar perfil/CENTER/ARM
se conseguir identificar a placa. Nesta tentativa não houve novo HELLO aceito,
nem evidência de envio desses comandos. Não alegar validação de força sob carga.

## Verificação da alteração visual

Verificação Electron em janela oculta com IPC simulado e comparação visual
dos temas vermelho/branco. Nenhuma instalação da 1.2.10 pelo agente.
Não é uma correção comprovada para a falha USB relatada.
