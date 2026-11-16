# Malth Pro 1.2.7 — conexão automática, perfis e personalização

31/10/2026.

- Arduino Leonardo identificado automaticamente ao abrir ou conectar USB, inclusive
  no primeiro uso. A porta deve responder como Malth Pro no protocolo esperado
  antes de receber perfil, centralização e habilitação. Não percorre COM arbitrária.
- Último perfil selecionado restaurado ao abrir. Trocar perfil aplica seus valores
  salvos imediatamente. Salvar guarda/aplica alterações. Reconectar usa valores
  salvos, preservando rascunhos ainda não salvos na interface.
- Aba Configurações ao lado de Câmbio, substituindo a engrenagem. Quatro painéis:
  Encoder incremental, Ponte H e PWM, Aparência e Imagem do volante.
  Encoder explicado na tela: CPR = PPR ×4, exemplo 400 PPR = 1600 CPR;
  contagens já decodificadas após ×4 não devem ser multiplicadas novamente.
- Roda de cores diretamente no painel Aparência, com controle Intensidade.
  Cor aplicada imediatamente e salva no computador, independente dos perfis,
  sem enviar comandos ao Arduino; sem cores rápidas ou janelas extras.
- Escolher PNG do volante (até 2 MB), manter a rotação pelo encoder, restaurar
  padrão e persistir a imagem no computador. PNG validado antes de salvar.
- Ícone VOLANTE passa a ser apenas diagnóstico; sem seleção manual de porta.
- Atalho Esc de interrupção e opção Desconectar removidos conforme solicitação.
  Ajustar força pelos controles e Salvar. Perda de USB/comunicação e watchdogs
  continuam desabilitando a saída automaticamente; a sessão é refeita ao reconectar.
- Indicador diferencia direção HID de conexão serial. Um joystick reconhecido
  sem sessão de configuração não é mais apresentado como FFB conectado.
- Seletor de intensidade FFB: Manual ou níveis de 10% a 100%, em passos de 10.
  Preenche ganhos e batentes, mantém mínima 0 e máxima até 25; escalas e filtros
  individuais são preservados. Edição manual retorna a Manual. Aplicar com Salvar.
- Firmware permanece 0.1.2; limite de bancada 25%. Não requer novo HEX.
- Pedais planejados: Hall linear analógico 49E e ímãs de neodímio; leitura analógica
  e calibração existentes preservadas. Fabricante/pinagem ainda a conferir.

Validação sem hardware: 14 testes de seleção/conexão, protocolo e PWM passaram;
testes Electron de restauração/troca de perfis, reconexão com rascunho, ausência
de comando Esc, diagnóstico sem conectar e regressão de pedais passaram.
Cores vermelho/branco, persistência, PNG/restauração e presets foram verificados.
Quatro abas e distribuição dos controles conferidas sem cortes em 1080 × 620.
Nenhuma porta real aberta, motor acionado ou firmware gravado nesta rodada.
O novo aplicativo não foi instalado na bancada; reconhecimento e força físicos
continuam com a validação pendente registrada no projeto.
