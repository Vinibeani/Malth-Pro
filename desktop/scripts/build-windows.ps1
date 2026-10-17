$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$certificate = Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.Subject -eq 'CN=Malth Pro' -and $_.Issuer -eq 'CN=Malth Pro' -and $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) } |
  Select-Object -First 1
if (-not $certificate) {
  throw 'Certificado local ausente. Execute scripts\create-local-test-certificate.ps1 primeiro.'
}

$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
$pnpmPath = if ($pnpmCommand) { $pnpmCommand.Source } else { $null }
if ($pnpmPath) {
  if (-not (Test-Path -LiteralPath 'node_modules\electron\dist\electron.exe')) {
    & $pnpmPath install
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar as dependências do aplicativo.' }
  }
  & $pnpmPath dist:win
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  if (-not (Test-Path -LiteralPath 'node_modules\electron\dist\electron.exe')) {
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar as dependências do aplicativo.' }
  }
  npm run dist:win
} else {
  throw 'Instale Node.js e pnpm ou npm para gerar o instalador.'
}
if ($LASTEXITCODE -ne 0) { throw 'A geração do instalador falhou.' }

$installer = Get-ChildItem (Join-Path $PSScriptRoot '..\..\dist\windows') -Filter '*Setup*.exe' -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $installer) { throw 'O instalador não foi encontrado na saída da compilação.' }

$signature = Get-AuthenticodeSignature -FilePath $installer.FullName
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -ne 'CN=Malth Pro') {
  throw "O instalador foi gerado, mas a assinatura não passou na conferência local: $($signature.Status)."
}

Write-Host "Instalador assinado gerado: $($installer.FullName)"
Write-Host "Assinatura: $($signature.SignerCertificate.Subject)"
