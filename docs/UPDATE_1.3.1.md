# Malth Pro 1.3.1 / firmware 0.1.7

O ETS2 reconhecia o Malth Pro e enumerava seus efeitos, mas o usuário relatou
ausência de FFB durante o jogo. O batente local funcionou com firmware Malth
e, nesse teste do usuário, a comunicação permaneceu funcionando.

## Correções e mudanças

- A declaração HID PID passa a anunciar somente o atuador X do volante,
  dentro da coleção física de junta prevista pelo PID. Antes anunciava X/Y,
  embora Y seja uma entrada de pedal e a montagem tenha apenas um motor.
  Entradas de pedais, câmbio e botões continuam disponíveis.
- Preservada a disposição dos bytes Set Effect: o antigo bit Y vira reservado.
  A magnitude assinada passa diretamente ao único eixo de força. A projeção
  por seno de um joystick XY foi removida: com Direction Enable e direção zero,
  ela anulava uma força constante válida. Esse defeito foi reproduzido em teste;
  não há captura dos pacotes enviados pelo ETS2 nesta bancada.
- Diagnóstico HID 0x41 inclui quantidade de relatórios PID recebidos/rejeitados,
  efeitos criados/alocados/em execução, ganho global e dados do primeiro efeito
  ativo. Isso permite distinguir ausência de envio do jogo, falha de criação,
  efeito parado e força calculada sem depender apenas de sentir o motor.
- Configurações oferece modelos de volante Padrão e Scania, mantendo PNG
  externo. Alternar modelos preserva o arquivo pessoal; a seleção anterior é
  mantida na atualização. Modelo F1 depende de uma imagem futura.

Pinagem BTS D8/D9/D10, modo 2PWM + 1DIR, perfil salvo, EEPROM, mínimo/máximo
do usuário e batentes progressivos preservados. Sem limite fixo de bancada.

## Evidências

O registro local do ETS2 mostrou Malth Pro, Constant Force e demais efeitos
disponíveis; o perfil de controles estava com FFB habilitado. Também mostrou
X e Y como eixos de força antes desta correção. A SCS documenta que o FFB físico
do ETS2/ATS é enviado como força constante por DirectInput.

O HEX EMC Lite0932, fornecido pelo usuário e com hash conferido, declara apenas
X dentro da junta física. Sua flash foi analisada estaticamente com Ghidra12.1.4
e JDK21 portáteis oficiais. Importação binária em código AVR, endereço0 e unidade
de endereço2 bytes:100 funções identificadas receberam pseudocódigo. Nomes de
interrupção automáticos do perfil AVR genérico não certificam o vetor Leonardo;
endereços/instruções e avisos do analisador devem ser considerados.

Ghidra também analisou EMC Pro EMCUtility.exe/EMC.dll. Eles contêm a camada
.NET; a saída nativa de Ghidra não equivale à recuperação dessa lógica em C#.
REA identificou declarações de ganhos, força, ponte H e chamadas HID. ILSpy9.1
exportou o executável e tipos legíveis, mas rotinas protegidas das DLLs falharam
na reconstrução. Não foi recuperado todo o código privado nem copiado o firmware
EMC. Ferramentas e artefatos de pesquisa ficam fora do pacote de fontes.

O usuário indicou EMCFFBV2 como possível fonte aberta. Na consulta de03/11/2026,
o repositório oficial declarava distribuição somente de binários e FFB sob
licença. Não foi utilizado como fonte de código aberto nem alterada ativação.
Referência: https://github.com/ebolzMagy/EMCFFBV2 .

## Verificação e limite

23 testes Node,138 verificações de controle/PID em instruções AVR e conferência
Electron dos modelos/persistência aprovados. O teste do descritor verifica o
único atuador e os tamanhos/posições dos relatórios. A regressão PID recebe
Set Effect, Start e magnitudes negativas/positivas com Direction Enable e
direção zero, sem zerar o sinal. Não simula o driver Windows nem o jogo.

HEX com27892 bytes, dentro dos28672 bytes disponíveis ao aplicativo Leonardo;
1914 bytes globais SRAM, sem contar pilha. O Arduino estava desconectado:
firmware0.1.7 não gravado e FFB desta versão no ETS2 ainda não validado.
O relato de batente estável corresponde à versão anterior e não certifica
estabilidade em todas as situações ou jogos.

Para usar a correção, atualize aplicativo e firmware. A declaração HID mudou;
se o Windows/jogo apresentar outra instância, selecione novamente o Malth Pro
no ETS2. Use o perfil desejado e deixe o efeito local fora do jogo desligado
durante a validação dos efeitos enviados pelo jogo.

Referências primárias:

- SCS FFB: https://blog.scssoft.com/2021/10/force-feedback-faq.html
- USB PID1.0: https://www.usb.org/sites/default/files/documents/pid1_01.pdf
- Microsoft, direção de efeitos: https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ee417536(v=vs.85)
- Ghidra: https://github.com/NationalSecurityAgency/ghidra/releases/tag/Ghidra_12.1.4_build
- ILSpy: https://github.com/icsharpcode/ILSpy/releases/tag/v9.1
