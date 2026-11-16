$ErrorActionPreference = 'Stop'

$signingDirectory = Join-Path $env:LOCALAPPDATA 'MalthPro\Signing'
$cerPath = Join-Path $signingDirectory 'MalthPro-Test.cer'
$subject = 'CN=Malth Pro'

New-Item -ItemType Directory -Force -Path $signingDirectory | Out-Null
$certificate = Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.Subject -eq $subject -and $_.Issuer -eq $subject -and $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) } |
  Sort-Object NotAfter -Descending |
  Select-Object -First 1

if (-not $certificate) {
  $certificate = New-SelfSignedCertificate `
    -Subject $subject `
    -Type CodeSigningCert `
    -CertStoreLocation Cert:\CurrentUser\My `
    -KeyAlgorithm RSA `
    -KeyLength 3072 `
    -HashAlgorithm SHA256 `
    -KeyExportPolicy NonExportable `
    -NotAfter (Get-Date).AddYears(2)
}

Export-Certificate -Cert $certificate -FilePath $cerPath -Force | Out-Null
Import-Certificate -FilePath $cerPath -CertStoreLocation Cert:\CurrentUser\Root | Out-Null
Import-Certificate -FilePath $cerPath -CertStoreLocation Cert:\CurrentUser\TrustedPublisher | Out-Null

Write-Host "Certificado de teste criado e confiado somente para este usuário do Windows."
Write-Host "Publicador: $($certificate.Subject)"
Write-Host 'A chave privada permanece no repositório de certificados do Windows e não é exportada.'
