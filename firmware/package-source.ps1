$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$appVersion = (Get-Content -LiteralPath (Join-Path $repoRoot 'desktop/package.json') -Raw | ConvertFrom-Json).version
$stageId = [Guid]::NewGuid().ToString('N')
$packageRoot = Join-Path $repoRoot "dist/packages/staging/MalthPro-CodigoFonte-$appVersion-$stageId"
New-Item -ItemType Directory -Force $packageRoot | Out-Null
foreach ($name in @('README.md','.gitignore')) {
  Copy-Item -LiteralPath (Join-Path $repoRoot $name) -Destination $packageRoot -Force
}
Copy-Item -LiteralPath (Join-Path $repoRoot 'malth-control') -Destination $packageRoot -Recurse -Force
$docsStage = Join-Path $packageRoot 'docs'
New-Item -ItemType Directory -Force $docsStage | Out-Null
Copy-Item -LiteralPath (Join-Path $repoRoot 'docs/images') -Destination $docsStage -Recurse -Force
foreach ($name in @('PROJECT_STATUS.md','ARCHITECTURE_TRACE.md','UPDATE_1.2.4.md','UPDATE_1.2.5.md','UPDATE_1.2.6.md','PWM_BTS7960.md')) {
  Copy-Item -LiteralPath (Join-Path $repoRoot "docs/$name") -Destination $docsStage -Force
}
$desktopStage = Join-Path $packageRoot 'desktop'
New-Item -ItemType Directory -Force $desktopStage | Out-Null
foreach ($name in @('main.cjs','preload.cjs','device-link.cjs','motor-session.cjs','device-protocol.cjs','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','README.md','assets','scripts','tests')) {
  Copy-Item -LiteralPath (Join-Path $repoRoot "desktop/$name") -Destination $desktopStage -Recurse -Force
}
$firmwareStage = Join-Path $packageRoot 'firmware'
New-Item -ItemType Directory -Force $firmwareStage | Out-Null
foreach ($name in @('Leonardo','libraries','tests','.gitignore','README.md','THIRD_PARTY.md','LICENSE-LGPL-3.0.txt','build-firmware.ps1','upload-leonardo.ps1','package-source.ps1')) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $firmwareStage -Recurse -Force
}
New-Item -ItemType Directory -Force (Join-Path $firmwareStage 'releases') | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'releases/Malth Pro-v0.1.2.hex') -Destination (Join-Path $firmwareStage 'releases') -Force
# Fontes exatas do core tambem acompanham a distribuicao para consulta/religacao.
$core = Join-Path $PSScriptRoot 'tooling/data/packages/arduino/hardware/avr/1.8.8'
if (-not (Test-Path -LiteralPath $core -PathType Container)) {
  $core = Join-Path $PSScriptRoot 'reference/ArduinoAVR-1.8.8'
}
if (-not (Test-Path -LiteralPath $core -PathType Container)) {
  throw 'Prepare o firmware com build-firmware.ps1 para obter os fontes do core Arduino.'
}
$coreStage = Join-Path $firmwareStage 'reference/ArduinoAVR-1.8.8'
New-Item -ItemType Directory -Force $coreStage | Out-Null
Copy-Item -LiteralPath (Join-Path $core 'cores') -Destination $coreStage -Recurse -Force
New-Item -ItemType Directory -Force (Join-Path $coreStage 'variants') | Out-Null
Copy-Item -LiteralPath (Join-Path $core 'variants/leonardo') -Destination (Join-Path $coreStage 'variants') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $core 'boards.txt'),(Join-Path $core 'platform.txt') -Destination $coreStage -Force
# Empacotar caminhos relativos, incluindo os arquivos .gitignore.
$zipPath = Join-Path $repoRoot "dist/packages/MalthPro-CodigoFonte-$appVersion-GitHub.zip"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipStream = [IO.File]::Open($zipPath, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
$archive = New-Object IO.Compression.ZipArchive($zipStream, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in Get-ChildItem -LiteralPath $packageRoot -Recurse -File -Force) {
    $relativePath = $file.FullName.Substring($packageRoot.Length + 1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relativePath, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $archive.Dispose()
  $zipStream.Dispose()
}
Get-Item -LiteralPath $zipPath | Select-Object FullName,Length
