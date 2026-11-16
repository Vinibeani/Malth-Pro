# Malth Pro 1.3.7 — Configurações sem rolagem

O atalho de centralização fica no topo do container central, acima de Aparência.
Encoder incremental e Ponte H/PWM compartilham o container esquerdo.
O container direito mantém os modelos de volante e a escolha de PNG externo.

A roda de cor foi reduzida de180 para128px e a prévia do volante de180 para140px.
Espaçamentos foram ajustados para exibir todos os controles na janela1080×620,
com a ampliação1,2 usada pelo aplicativo. CampoHEX e intensidade preservados.
Os três containers tiveram altura útil364px e conteúdo364px, sem excedente
vertical/horizontal na prévia Electron com comunicação simulada. Captura visual
conferida em firmware/build/settings-137.png. Isso não é teste de hardware.

Firmware0.1.12 preservado byte a byte; nenhum flash, comando aoArduino, mudança
de perfil ou teste energizado nesta atualização. A falha de desconexão após
colisão com motor energizado continua em investigação; verUPDATE_1.3.6.md.
Instalador1.3.7 e ZIP de fontes são gerados para entrega, sem instalação automática.
