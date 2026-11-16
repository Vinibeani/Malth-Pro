# Malth Pro1.3.4 — pedais opcionais e atalho de centro

Acelerador e Freio agora têm checkbox como Embreagem/Freio de mão.
Desmarque e Salve: perfil envia o PEDAL_MASK já suportado pelo firmware0.1.9;
o eixo desabilitado fica em zero e captura Min/Max fica indisponível.
Configuração é por perfil; padrões antigos mantêm acelerador/freio habilitados.

Configurações → Centralizar por atalho → Definir atalho. Escolha tecla,
combinação ou botão do Malth Pro. Remover limpa o atalho. Preferência global
salva no computador; atalho de teclado usa registro global do Windows, funciona
com jogo em primeiro plano enquanto Malth Pro estiver aberto. Botão usa leitura
Gamepad do Malth em intervalo de100ms com backgroundThrottling desabilitado.
Botão de outros controles não dispara; uma pressão prolongada não repete CENTER.
Captura suspende temporariamente o atalho anterior. Atalho ocupado mostra erro
e preserva o anterior. Esc cancela somente a escolha de atalho.

Ativação chama MotorSession.command(CENTER), o mesmo fluxo do botão Centralizar,
preservando fila, confirmação e retomada do FFB. Não altera calibração dos pedais.
Nenhum comando ao Arduino foi executado nesta implementação.

25 testes anteriores Node e dois novos de atalho/máscara aprovados. Teste Electron
com IPC simulado aprovou ambos pedais desligados enviados no perfil e captura de
tecla/botão. Screenshot de configurações conferido. Uso global real dentro de
ETS2/ATS e centralização física ainda pendentes. Firmware0.1.9 preservado;
não é necessário regravar Arduino para estas opções.
