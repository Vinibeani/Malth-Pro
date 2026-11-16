# Malth Pro 1.2.4

20/10/2026.

## Correcoes

- A imagem do volante nao reaplica a inversao sobre a telemetria ja processada
  pelo Leonardo. A previa por controle generico continua aplicando a opcao local.
- A sessao do aplicativo acompanha a invalidacao do centro feita pelo firmware
  quando CPR ou inversao mudam. Confirma a centralizacao antes de retomar a forca.
- Esc continua impedindo a retomada automatica, inclusive durante envio ou
  gravacao de um perfil. Centralizar explicitamente permite retomar.
- Um envio sem confirmacao invalida a centralizacao local, evitando reutilizar
  um estado possivelmente antigo apos uma falha de COMMIT ou SAVE.
- Cada envio usa uma copia do perfil feita antes de entrar na fila.

## Atualizacao

Feche o aplicativo anterior e execute `Malth Pro Setup 1.2.4.exe`.
O firmware continua sendo `MalthPro-Leonardo-v0.1.0.hex`, protocolo 2.
Estas correcoes sao no aplicativo Windows e nao exigem regravar o Leonardo.
O certificado continua sendo o certificado local de teste Malth Pro.

Ao alterar CPR ou inversao e aplicar o perfil com a forca em uso, deixe o volante
reto: a nova centralizacao usa a posicao atual, assim como na conexao inicial.
Mudar apenas o angulo ou os ajustes dos pedais nao solicita outra centralizacao.

## Conferencia de bancada pendente

1. Conectar com o volante reto e conferir conexao, direcao da imagem e eixos.
2. Aplicar a inversao, mantendo o volante reto durante a centralizacao; conferir
   se a imagem acompanha o eixo entregue ao Windows, sem segunda inversao.
3. Alterar CPR com o volante reto e confirmar que o envio termina e a forca retoma
   sem erro de centralizacao. Conferir o curso usando o CPR correto do encoder.
4. Pressionar Esc, aplicar um perfil e confirmar que a forca continua interrompida.
   Deixar o volante reto e clicar Centralizar para retomar.
5. Conferir pedais habilitados/desabilitados, captura Minimo/Maximo e ambos os
   modos de cambio.
6. Validar sentido do motor, batentes, efeitos e estabilidade no jogo, mantendo
   o limite de bancada de 25% previsto no firmware.

O periodo programado de controle nao comprova a latencia final. Resposta fisica,
latencia e estabilidade ainda dependem dessas verificacoes. Nao houve nova
execucao de testes automatizados nesta atualizacao.
