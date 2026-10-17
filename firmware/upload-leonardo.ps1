param([Parameter(Mandatory = $true)][ValidatePattern('^COM[0-9]+$')][string]$Port)
$ErrorActionPreference = 'Stop'
$cli = Join-Path $PSScriptRoot 'tooling/cli/arduino-cli.exe'
$config = Join-Path $PSScriptRoot 'tooling/arduino-cli.yaml'
$image = Join-Path $PSScriptRoot 'releases/MalthPro-Leonardo-v0.1.0.hex'
if (-not (Test-Path -LiteralPath $cli) -or -not (Test-Path -LiteralPath $image)) {
  throw 'Execute build-firmware.ps1 primeiro para preparar as ferramentas e o HEX.'
}
# O Arduino CLI faz o toque a 1200 baud e procura a porta temporaria do Caterina.
& $cli upload --fqbn arduino:avr:leonardo --port $Port --config-file $config --input-file $image
if ($LASTEXITCODE -ne 0) { throw 'Falha na gravacao. Feche o Malth Pro/Monitor Serial e confira a porta do Leonardo.' }
Write-Host 'Firmware gravado. Abra o Malth Pro 1.1.0 e conecte o Leonardo.'
