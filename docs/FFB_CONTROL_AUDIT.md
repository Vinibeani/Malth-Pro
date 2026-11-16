# Auditoria de cada opção FFB

Todos os18 ajustes manuais visíveis são enviados nos65 registradores. O teste
ffb-controls compara a lista efetivamente renderizada (HTML+effectOptions), a
codificação do perfil e enumRegister do firmware; testa alteração isolada e sem
alterar outros registradores. Isto comprova ligação de software, não sensação.

| Opção | Registro | Aplicação real |
|---|---|---|
| Batente rígido/suave | HARDLOCK/SOFTLOCK | Força restauradora somente fora do meio curso; applySteeringStops |
| Força mínima/máxima | MIN_FORCE/MAX_FORCE | Compensação de piso/limite efetivo no motorMagnitude |
| Constante + escala | CONSTANT_GAIN/CONSTANT_SCALE | TipoPID Constant; ganho e escala na soma |
| Mola + escala | SPRING_GAIN/SPRING_SCALE | CondiçãoPID Spring e posição relativa |
| Senoidal + escala | SINE_GAIN/SINE_SCALE | TipoPID Sine, amplitude/período/envelope |
| Amortecimento + filtro | DAMPER_GAIN/DAMPER_FILTER | CondiçãoPID Damper; velocidade filtrada |
| Atrito + filtro | FRICTION_GAIN/FRICTION_FILTER | CondiçãoPID Friction; sinal do movimento filtrado |
| Inércia + filtro | INERTIA_GAIN/INERTIA_FILTER | CondiçãoPID Inertia; aceleração filtrada |
| Efeito fora do jogo + força | DESKTOP_EFFECT/DESKTOP_FORCE | Mola/Damper/Friction locais quando não há efeito de jogo ativo |

Presets aplicam ganhos/batentes na interface; força mínima/máxima permanecem
manuais. Restaurar ganhos repõe gainDefaults, também enviado ao Salvar.
Escalas têm referência50=1x,0=0.5x,100=1.5x; ganho0 zera o respectivo efeito.

O jogo decide quais tipos envia. ETS2 nos ensaios enviados usou Constant Force,
portanto terreno e impactos estão misturados nessa força. Não há evidência de
efeitosPID separados de Sine/Spring/Damper nos registros desse teste. Ajustar
ganho de um tipo que o jogo não envia não cria esse tipo. A percepção de todos
os ajustes requer ensaios controlados por tipo e confirmação no motor.

Problema confirmado0.1.10: após inversão da força, D8 esperava até a próxima
atualização500Hz para terminar assentamento. O teste extrai funções reais
motorOff/writeMotor/serviceMotorEnable de Controller.cpp e simula inversões
a cada2ms. Antes:17falhas em40 verificações, uma em cada frequência4..20kHz,
pois saída não chegava a habilitar. Correção atende o assentamento no laço
principal, preservando dois períodosPWM/ausência de busy-wait e todos os
desarmes. Depois:40/40aprovadas; também93PWM,82efeitos,142controleAVR.
Isto é evidência de um defeito que suprimia efeitos rápidos, não validação
física de terreno nem solução completa das quedas sob potência.

Refinamento0.1.12: polling sozinho ficou em43/97amostras habilitadas no250Hz. Timer1overflow somente na comutação corrigiu o caso laço ocupado,74/74AVR e93/97amostras habilitadas na placa sem potência. Todos11tipos tiveram PWM sem rejeição; tátil pendente. Ver UPDATE_1.3.6.md.

Após0.1.12, usuário confirmou retorno e terreno no ETS2; captura180s sem reinício/rejeição. Demais validações físicas por efeito e jogos permanecem delimitadas como em UPDATE_1.3.6.md.
