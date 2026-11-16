# Malth Pro 1.3.0 / firmware 0.1.5 — configuração HID

02/11/2026. Numeração escolhida pelo usuário: 1.3.0, depois 1.3.1 etc.

## Comparação com EMC Lite

REA inspecionou EMCHid.dll sem executar o fornecedor. Identidade SHA256
961c883847056296676dc273fe02c111be131c0e3acdf9c05e162168f5dcd50a,
MVID edfd88a4-aea7-4775-8de1-94e7637fd6e6. Declarações HidD_SetFeature e
HidD_GetFeature confirmadas (tokens 0x060000a5/a6); CreateFile/ReadFile/WriteFile
também presentes. Metadados e inspeção anterior do HEX mostram um configurador
HID. Corpos protegidos/ofuscados não permitem afirmar equivalência completa
com o protocolo proprietário nem explicar sozinhos sua estabilidade física.
Evidências em emc-analysis/lite-hid-*-20261102.json, excluídas do pacote de fontes.

Malth Pro passa a usar o mesmo padrão de transporte de configuração por HID,
com protocolo e implementação próprios. Não é cópia do código protegido EMC.

## Implementação

- Coleção HID Vendor 0xFF00/usage1 separada da coleção do volante e dos IDs PID.
- Feature Report 0x40 com 64 bytes: ID, tamanho e até 62 bytes de dados.
  Comandos de perfil cabem em um report; respostas JSON são fragmentadas.
- ISR só recebe/copia buffer limitado; interpretação, EEPROM, perfil e motor
  permanecem no laço principal. Não enviar torque dentro de callback USB.
- Aplicativo usa node-hid assíncrono e valida HELLO antes de perfil/CENTER/ARM.
  Polling não sobrepõe leituras. Falhas encerram a sessão e retomam descoberta.
- Aplicativo não abre COM4 ou qualquer COM para funcionamento. CDC fica para
  upload do Leonardo. Não há fallback que reintroduza a sessão serial antiga.
- Fechamento tenta DISARM somente depois de autenticar o firmware; watchdog
  de heartbeat continua independente. Perfis, EEPROM, batentes, ganhos e força
  mínima/máxima preservados. Sem teto de bancada.
- Correção de upload: watchdog do controle não impede o reset1200baud do core.
  Primeira atualização a partir da versão antiga exigiu RESET físico.

## Verificação

124 verificações de controle/HID e 93 de PWM em AVR, 22 testes Node aprovados.
Cobrem fragmentação, fila ocupada, frames inválidos, seleção da coleção,
HELLO/perfil/CENTER/ARM, falha de polling e ausência de DISARM em firmware alheio.

Primeira tentativa automática de upload falhou antes da escrita: aplicação
não entrou no Caterina. Após usuário apertar RESET com fonte de potência
desligada, bootloader COM3 identificado; 27.184 bytes gravados e lidos de volta
pelo avrdude, verificação concluída. Protocolo novo identificado como0.1.5.

Primeiro teste real apenas HELLO/PING: 466 estados em15,493s, nenhuma falha,
armed0/centered0/overruns0. Fonte do motor desligada, sem perfil/CENTER/ARM.
Teste sob torque e permanência no batente ainda não concluídos neste registro.

## Limite da conclusão

Remover dependência da COM elimina aquele caminho de erro de abertura serial.
Isso não comprova ausência de perturbação elétrica nem elimina por declaração
uma falha do dispositivo USB inteiro. Resultado energizado precisa ser observado.

Referência primária da API utilizada: https://github.com/node-hid/node-hid .
