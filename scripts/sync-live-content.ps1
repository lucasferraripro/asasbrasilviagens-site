param(
    [string]$Url = "https://raw.githubusercontent.com/lucasferraripro/asasbrasilviagens-site/master/content.json"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$contentPath = Join-Path $root "content.json"
$backupDir = Join-Path $root ".agents\project-memory\content-backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

if (Test-Path $contentPath) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item -LiteralPath $contentPath -Destination (Join-Path $backupDir "content-$stamp.json") -Force
}

$ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$bytes = $client.GetByteArrayAsync("$Url`?_=$ts").GetAwaiter().GetResult()
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$json = $text | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($text) -or $text.Trim() -eq "{}") {
    throw "Conteudo publicado veio vazio. Abortado para nao apagar alteracoes do painel."
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($contentPath, ($text.TrimEnd() + [Environment]::NewLine), $utf8NoBom)
Write-Host "content.json sincronizado com o conteudo publicado em $Url"
