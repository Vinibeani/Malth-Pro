# Malth Pro1.3.6 / firmware0.1.12 — efeitos rápidos

Usuário exige funcionamento de todas as opções FFB. Auditoria rastreia18ajustes
manuais visíveis até registros/consumidores; teste inclui lista real da interface,
enumRegister do firmware e ausência de alteração cruzada.28testesNode aprovados.
Ver FFB_CONTROL_AUDIT.md para requisitos por tipo de efeito/jogo e limites físicos.

O pedido de arquivo.reg não fornece uma licença válida do EMC Pro. Nenhuma chave
foi fabricada nem licença alterada. A comparação continuou por evidência estática.
REA Pro:tiposForce/ForceAIO/Settings55métodos/54malformed;Config/EmcManager/
EmcState218métodos/212malformed. Propriedades não comprovam algoritmos de efeito.

HEXFFBWheel0.16 indicado pelo usuário validado:27250bytes,hash85c22fd7ac5bbe6521f4a438cadb862adc5492f3d0cd9ffb4252de341813b72b.
Ghidra direto exportou202/202funções(AVR,unidade de endereço2bytes). Não é
código-fonte original nem recuperação automática de significado. Registradores
nomeados no AVR genérico não correspondem necessariamente ao ATmega32U4;
conferir endereços reais com avr-objdump. Rotina em byte0xC88 escreve registradores
0x008A..0x008D diretamente e retorna; não transplantar seus pinos para a montagem
D8/D9/D10. Arquivo não foi gravado no Arduino nem distribuído no pacote Malth.

Defeito reproduzido no Malth0.1.10: writeMotor só terminava assentamento no
próximo cálculo500Hz. Alternância250Hz muda sinal em cada cálculo e reinicia a
espera antes de D8 habilitar. Teste extrai as implementações reais de motorOff e
writeMotor e simula entradas alternadas, microtempo e registradores AVR:
17falhas em40verificações nas17frequênciasPWM4..20kHz.

0.1.11 acrescenta serviceMotorEnable no laço principal, fora do ciclo2ms.
Mantém os dois períodosPWM antes de habilitar, sem bloqueio/ISR extra, com
desarmes por ARM/centro/USB/pausa/PID/watchdog. Magnitude e piso/teto do perfil
preservados. Depois40/40aprovadas, além de93PWM,82efeitos e142controleAVR.
O teste modela chamadas rápidas do laço; não substitui medição física de temporização.

É correção de um defeito que suprimia efeitos rápidos, não comprovação de que
terreno/FFB completo ou queda USB sob potência estão resolvidos. Resultado
anterior0.1.10 continuou NÃO aprovado pelo usuário. Validação física pendente.


## Refinamento no hardware e leitura dos11 tipos

0.1.10 na placa:Square250Hz,100amostras/100com força não nula, D8habilitado40,
settling60, sem rejeições.0.1.11 com polling no laço:97amostras,D8habilitado43,
settling54. Essa amostragem não mede duty/tempo exato e mostrou que o ajuste
por polling ainda não bastava para o laço ocupado. ModeloAVR reforçado com
nenhuma chamada intermediária de polling voltou a falhar17/74verificações.

0.1.12 termina assentamento por interrupção de overflowTimer1, habilitada
apenas durante a comutação. Três limites de ciclo garantem ao menos dois
períodos completosPWM; depois a interrupção é desligada. Há polling como
fallback; ambos conferem ARM,centro,USB,pausa/PID e watchdog. Campos compartilhados
comISR são voláteis. Não há espera ocupada nem mudança de pinagem/força do perfil.
AVR laço livre/ocupado:74/74;93PWM,82efeitos,142controle/PID aprovados.

Usuário confirmou jogos fechados, fonte12V OFF e USB mantido. Gravações0.1.11
e depois0.1.12 fizeram backupflash/EEPROM e verificação, EEPROM idêntica.
0.1.12:28296bytes verificados, hash126e7c87c1617d0994a96ff339a7c457b4a2916b3aed214d76326dbaa1c82342.
Sessão isolada de teste não alterou perfil/EEPROM; após reboot definiu apenas
centro de sessão, armou com heartbeat, limpou efeitos e desarmou ao sair.

| Efeito0.1.12 | Amostras | Com força não nula | D8habilitado | Rejeições |
|---|---:|---:|---:|---:|
| Square250Hz |97|97|93|0|
| Constant |22|22|22|0|
| Ramp250ms |21|15|15|0|
| Square10Hz |21|21|21|0|
| Sine10Hz |21|21|21|0|
| Triangle10Hz |21|21|21|0|
| SawUp10Hz |20|20|20|0|
| SawDown10Hz |20|20|20|0|
| Spring |20|20|20|0|
| Damper |20|20|20|0|
| Inertia |20|20|20|0|
| Friction |19|19|19|0|

Rampa terminou sua duração durante a coleta, portanto as últimas amostras
zero são esperadas. Condições receberam offsets positivos/negativos para
observar respostas sem mover o motor. Teste é leitura lógica/PWM na placa,
não torque nem avaliação tátil.250Hz passou de40/100para93/97amostras habilitadas;
não apresentar isso como percentual exato de potência ou duty físico.
Os18controles e11tipos são critérios da auditoria, sem prometer aprovação física
antes do usuário testar. Novo ensaioETS2 com força baixa escolhida por ele foi
autorizado e leitura180s iniciada; resultado ainda pendente neste registro.


## Confirmação do usuário no ETS2

Após0.1.12, usuário respondeu literalmente: “Senti retorno e terreno”.
Janela de leitura180s:2910amostras,857ativas,23119relatórios adicionais,
zero rejeições/overruns;uptime114877→294833mssemreinício. Posição−566..622,
força calculada−1499..1497, perfil observado mínimo5/máximo25 definido pelo
usuário. Fonte/forças foram operadas por ele; leitura passiva não enviou comandos.
Isso valida retorno e terreno neste ensaioETS2. Não comprova todas as funções
físicas em todos os jogos nem estabilidade prolongada/ATS ainda não testado.
Os11tipos tiveram saída verificada sem potência;18ajustes foram rastreados e
testados em codificação. Não confundir essas coberturas com certificação global.

Firmware0.1.12 já está gravado no Arduino; app1.3.4 em uso é compatível.
Instalador1.3.6 e código-fonte correspondentes gerados e conferidos; instalação
do novo aplicativo não executada. Flash28296bytes,SRAMglobal1850bytes sem pilha.
Obsidian/Graphify atualizados preservando toda a história das falhas anteriores.


### Falha posterior em colisão —0.1.12,03/11/2026

Após confirmar retorno e terreno, o usuário relatou colisão no ETS2: força maior, perda de comunicação e jogo travado. A aprovação tátil anterior permanece histórica, mas a estabilidade sob colisão FALHOU; não considerar a versão solução concluída.

connection.log:19:14:34.804(Brasília) PING ACK_TIMEOUT;19:15:22.683 HELLO ACK_TIMEOUT;19:15:29.247 reconexão0.1.12. Fonte12V desligada/USB mantido confirmados pelo usuário. Leitura passiva às19:18:29.767:uptime182449ms, indicando inicialização perto19:15:27;129amostras estáveis,força0,D8baixo,zero rejeições/overruns após reinício. Windows lista interfacesHID eCOM13 OK. Nenhum eventoUSB/PnP pertinente encontrado na consultaSystem20min. Causa do reinício NÃO determinada: não atribuir automaticamente a fiação, fonte, ruído ou firmware.

Ensaio lógico de mudanças abruptas, com fonteOFF e jogo encerrado:1927atualizações/30s,484amostras,força−4998..4998,zero rejeições/overruns/reset. Primeiro ensaio foi inválido por ausência de espera apósReset antesCreate, gerou rejeições e força0; descartado como evidência de saída, script corrigido com espera e verificação de playing/cobertura. Nenhum perfil/EEPROM/firmware/pinagem alterado. Esse ensaio não reproduz corrente, carga mecânica nem os pacotes exatos da colisão. Não prova que hardware é a causa. Registros preservados em firmware/build/connection-collision-012.log, hid-012-positive-before-collision.json e hid-collision-stress-012.json. Necessária captura contínua antes/durante a falha para distinguir travamento/reset e verificar alimentação/USB sob carga. Não solicitar nova colisão energizada agora.

Instalador1.3.6 foi gerado antes desta nova falha; não instalado, não apresentar como correção da desconexão. Firmware0.1.12 permanece gravado. ETS2 parcialmente aprovado para sensação; estabilidade reaberta. ATS/outros jogos pendentes.


### Colisão comparativa sem potência —03/11/2026,19:28:55–19:30:55

Usuário confirmou fonte12V desligada/USB conectado e pronto na cabine doETS2 antes de iniciar. Captura passivaFeature0x41 começou; só então solicitado repetir colisão. Resposta: “Colidi; volante e jogo continuaram funcionando”.1928amostras/120s,905amostras comefeito/força;uptime807769→927716ms,semreinício. Força−2499..2499,posição−663..921,Constant recebido−5000..5000. PWM máximo observado249/999 eD8habilitado, sem potência no motor. Perfil mínimo5/máximo25 permaneceu inalterado, escolhido pelo usuário.

Recebidos52331→65535:contador saturou, portanto pelo menos13204relatórios adicionais, totalexatoindisponível. Rejeições1929→1929:zero NOVAS, contagem acumulada anterior do ensaio sintético inválido não deve ser atribuída a esta colisão. Overruns0→0. connection.logsemnovafalha na janela. Não houve envio de comando pelo coletor, flash nem ajuste de perfil.

Comparação: colisão com potência anteriormente desconectou/travoujogo e reiníciofoiobservado; sem potência a colisão e a recepçãoFFB permaneceram estáveis. Isso aumenta a suspeita de condição associada à etapa de potência/corrente/movimento, mas não isola ruído, queda de alimentação, aterramento ou firmware sob carga, nem reproduz exatamente todas as variáveis do ensaio energizado. Não declarar causa elétrica comprovada nem solução concluída. Perguntado se motor775 possui capacitor entreterminais, mantendo12VOFF; resposta pendente.

Evidência local:firmware/build/hid-012-collision-poweroff-20261103T222855_098Z.json e hid-012-collision-poweroff-summary.json. Referências de investigação, não prova causal:https://www.pololu.com/docs/0J15/9 e datasheetBTS7960Infineon seção6.2. Nenhuma instalação/flash/alteração depinagem nesta rodada.
