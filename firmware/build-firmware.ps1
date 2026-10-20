$ErrorActionPreference = 'Stop'
$firmwareRoot = $PSScriptRoot
$tooling = Join-Path $firmwareRoot 'tooling'
$cli = Join-Path $tooling 'cli/arduino-cli.exe'
if (-not (Test-Path -LiteralPath $cli)) {
  New-Item -ItemType Directory -Force (Join-Path $tooling 'downloads') | Out-Null
  $archive = Join-Path $tooling 'downloads/arduino-cli.zip'
  Invoke-WebRequest -Uri 'https://github.com/arduino/arduino-cli/releases/download/v1.5.1/arduino-cli_1.5.1_Windows_64bit.zip' -OutFile $archive
  Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $tooling 'cli') -Force
}
$configPath = Join-Path $tooling 'arduino-cli.yaml'
New-Item -ItemType Directory -Force $tooling | Out-Null
$paths = @{
  directories = @{
    data = Join-Path $tooling 'data'
    downloads = Join-Path $tooling 'staging'
    user = Join-Path $tooling 'user'
  }
}
# JSON tambem e aceito como YAML; evita problemas com espacos e barras de caminhos.
$paths | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $configPath -Encoding utf8
$installed = & $cli core list --config-file $configPath --format json | ConvertFrom-Json
$hasCore = @($installed.platforms | Where-Object { $_.id -eq 'arduino:avr' -and $_.installed_version -eq '1.8.8' }).Count -gt 0
if (-not $hasCore) {
  & $cli core update-index --config-file $configPath
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao obter o indice Arduino.' }
  & $cli core install arduino:avr@1.8.8 --config-file $configPath
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao obter o compilador AVR.' }
}
$release = Join-Path $firmwareRoot 'releases'
# Preservar as aspas do nome USB tambem no Windows PowerShell 5.1.
# ProcessStartInfo evita que a passagem de argumentos do shell as remova.
$compileArguments = @('compile','--fqbn','arduino:avr:leonardo',
  '--build-property','build.usb_product="Malth Pro"',
  '--libraries',(Join-Path $firmwareRoot 'libraries'),'--config-file',$configPath,
  '--build-path',(Join-Path $firmwareRoot 'build/leonardo'),'--output-dir',$release,
  (Join-Path $firmwareRoot 'Leonardo/MalthProLeonardo'))
$nativeArguments = foreach ($argument in $compileArguments) {
  $escaped = [Regex]::Replace([string]$argument, '(\\*)"', '$1$1\"')
  $escaped = [Regex]::Replace($escaped, '(\\+)$', '$1$1')
  '"' + $escaped + '"'
}
$compileInfo = New-Object System.Diagnostics.ProcessStartInfo
$compileInfo.FileName = $cli
$compileInfo.Arguments = $nativeArguments -join ' '
$compileInfo.UseShellExecute = $false
$compileInfo.CreateNoWindow = $true
$compileProcess = [System.Diagnostics.Process]::Start($compileInfo)
$compileProcess.WaitForExit()
if ($compileProcess.ExitCode -ne 0) { throw 'A compilacao do Leonardo falhou.' }
$target = Join-Path $release 'Malth Pro-v0.1.2.hex'
Copy-Item -LiteralPath (Join-Path $release 'MalthProLeonardo.ino.hex') -Destination $target -Force
Get-FileHash -LiteralPath $target -Algorithm SHA256
Write-Host "Firmware compilado: $target"
