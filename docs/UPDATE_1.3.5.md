# Malth Pro1.3.5 — Configurações e investigação FFB

Configurações reorganizadas em três painéis verticais: encoder/Ponte H/atalho;
aparência; imagem do volante. Intensidade tem trilho uniforme e curto, com cor apenas
no seletor. Campo hexadecimal aceita #RRGGBB ou #RGB e sincroniza roda/intensidade. Captura Electron com IPC simulado conferida; nenhum comando motor
foi enviado por esta alteração. Firmware0.1.9 preservado na primeira etapa de layout; correção0.1.10 abaixo.

## Ocorrência real03/11/2026

Usuário relatou giro brusco ao ligar caminhão ETS2, desconexão do volante e
travamento do jogo. Leitura passiva às18:15(Brasília) capturou seis amostras,
posição−1983..−2024 com meio curso2000, Constant magnitude cerca−3120,
ganho255, status22, zero rejeições/overruns e PWM ativo. Força calculada
alternou negativa dentro do curso e positiva fora dele. Windows retornou
erro0x1F e registro do aplicativo confirmou falha de Feature Report.
Uptime205819ms antes e71124ms cerca72s depois sustenta reinício da placa
no intervalo, sem identificar causa elétrica, USB ou watchdog.

Perfil observado: mínimo25/máximo50, escolhido no software; não alterado.
Uma força não nula pequena recebe piso25% nesse perfil, inclusive no batente.
Não foi introduzido teto de bancada nem alterado sinal/ganho sem evidência.

Usuário confirmou fonte12V desligada. Comparação passiva posterior de35s
ficou estável, mas não havia efeitos ativos, movimento ou ARM: não equivale
ao cenário de jogo sob carga e não comprova causa elétrica.

Usuário mostrou esquema e confirmou EN juntosD8, PWM D9/D10, encoderD0/D1.
Disse que para EMC precisa inverter terminais motor em relação ao desenho;
montagem Malth estava como desenho. Usuário trocou somente fios do motor,
com fonte desligada, e testou. Captura35s/578amostras mostrou zero efeitos
de jogo, posição1946→25993 e força de batente até−10000 com tetoPWM50%.
Sem reset nesse intervalo. Isso demonstra batente não restaurador com fios
invertidos; não atribuir esse teste ao FFB enviado pelo jogo.
Usuário retornou fios à montagem anterior e confirmou fonte desligada.
Confirmou também giro físico à direita acompanhado à direita no Malth/ETS2.

FFB no jogo continua sem solução física validada. Não recomendar nova troca
de fios nem nova gravação como correção comprovada. Próximo passo: correlacionar
efeito/sinal/posição com caminhão ligado e fonte12V desligada; separar estabilidade
USB e acionamento do motor. Verificar alimentação/retorno de corrente/ruído sob
carga sem presumir que o esquema lógico certifica a instalação real.


## Comparação efetiva e conversão0.1.10

Primeiras comparações sem efeitos terminaram enquanto o usuário ainda abria
o jogo. Repetição90s capturou1446 amostras,877com efeito ativo,22189 relatórios,
zero rejeições/overruns e uptime661821→751788ms, sem reinício com fonte12V OFF.
Posição−1606..1421 e força calculada−1500..1500. Entre311 amostras com movimento
baixo/posição distante do centro,296 tinham força calculada com mesmo sinal da
posição. É evidência de sentido não restaurador nesse ensaio, não prova isolada
de toda a causa da queda USB sob potência. controls.sii mostrou c_ff_gain5;
não foi alterado. Usuário confirmou imagem Malth/ETS2 acompanha giro físico.

[Microsoft Effect Direction](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ee417536%28v%3Dvs.85%29)
define direção como origem da força. Firmware tratava esse sinal como movimento
aplicado.0.1.10 acrescenta gameMotorForce entre cálculo de efeito e soma de ganhos:
efeitos vetoriais (constante/rampa/periódicos) são convertidos para força aplicada
oposta à origem; Direction Enable projeta na junta X pelo seno. Condições já
calculam força aplicada restauradora e não recebem inversão adicional. Batentes
locais/encoder/PWM/perfis e limites escolhidos pelo usuário preservados.
Teste com direções63/191, magnitude±5000, condições e batentes:82verificações
efeitos e142controle/PID AVR aprovadas. Não usar inversão física de fios para
corrigir somente efeitos de jogo, pois ela também altera o sentido dos batentes.

Com ETS2 fechado/fonte12V OFF confirmados,0.1.10 gravado/verificado27898bytes;
backupflash/EEPROM antes, EEPROM1024bytes idêntica depois. SRAM global1850bytes
sem pilha. App1.3.4 instalado reconectou e identificou0.1.10. Teste real sem
alimentação de potência: Constant+3000/direção63→força−899/OCR1A316;
Constant−3000→força+899/OCR1B316. Efeitos temporários limpos ao terminar.
Isto comprova polaridade lógica na placa, não estabilidade sob carga.

Usuário aceitou novo teste com intensidade baixa escolhida no software e mínima
zero; leitura passiva180s iniciada. Resultado físico ainda pendente neste registro.
Nenhum ajuste de intensidade foi imposto ou teto fixo acrescentado.
Instalador1.3.5 inclui firmware0.1.10 e código exato; instalação do app não executada.


## Resultado informado após teste0.1.10 e próxima referência

Leitura180s:2896amostras,557ativas,17576relatórios,zero rejeições/overruns,
uptime123080→303074mssemreset. Usuário mudou o perfil durante o ensaio de
mínimo25/máximo50 para mínimo5/máximo25. Entradas Constant≈−1380 produziram
força+413 e OCR1B88; havia PWM não nulo. Usuário relatou que continua sem
sentir terreno/buracos e que nenhuma função FFB está funcionando para ele.
Não converter esses contadores em alegação de êxito físico; força de retorno
e detalhes de terreno não foram aprovados pelo usuário. Causa ainda aberta.

Solicitou explicitamente REA no EMC PRO completo e comparação/reaproveitamento
dos repositórios e do firmware WheelConfig, além de sincronizar tudo no Obsidian.
Nova análise REA dos tipos Force/ForceAIO/Settings do Pro:55métodos,54malformed;
Config/EmcManager/EmcState:218métodos,212malformed. Propriedades de ganho são
identificáveis; corpos protegidos não permitem reproduzir algoritmos por nomes.
Evidências locais pro-force-20261103.json e pro-config-20261103.json.

WheelConfig.zip foi localizado na Área de Trabalho (157entradas; SHA256
229e2fb6e4a9cef357186af6fbfacca3a49444bb2b0725f1a8f70fb58ef3e962), sem HEX.
Usuário indicou arquivo separado Downloads/FFBWheel.0.16.leonardo.hex:
SHA25685c22fd7ac5bbe6521f4a438cadb862adc5492f3d0cd9ffb4252de341813b72b.
Localizado e incluído na investigação estática; não foi gravado/executado.
Próxima comparação deve examinar o firmware, não presumir efeitos pelo configurador.
