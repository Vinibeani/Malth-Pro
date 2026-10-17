# Interface do Malth Pro

Esta pasta contem o HTML, o CSS, o JavaScript e as imagens da interface.
O aplicativo Windows carrega estes arquivos locais por meio do Electron.

## Funcionamento

- Principal: volante, angulo, centralizacao, pedais e curva de freio.
- Force Feedback: ganhos, filtros, batentes e efeitos fora do jogo.
- Cambio: calibracao H-Shifter ou sequencial e leitura ao vivo.
- Configuracoes: encoder, BTS7960 e frequencia PWM.

No aplicativo instalado, a ponte nativa em `../desktop/` transmite os perfis
para o Leonardo e recebe a telemetria. Abrir apenas `index.html` no navegador
permite visualizar a interface e editar perfis locais; a comunicacao serial
implementada pelo aplicativo Windows nao esta disponivel nessa abertura direta.

Os perfis usam a chave `malth-control-studio-profiles-v1`. Dados de versoes
anteriores com o mesmo formato sao reconhecidos e migrados automaticamente.
Os arquivos exportados identificam o produto como Malth Pro.

Veja o [README principal](../README.md) para instalar, gravar o firmware e configurar.
