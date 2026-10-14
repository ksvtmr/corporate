# share-public.ps1 - Запуск публичной ссылки для внешнего доступа через Cloudflare Tunnel

$Cloudflared = "$env:USERPROFILE\.gemini\bin\cloudflared.exe"

if (-not (Test-Path $Cloudflared)) {
    Write-Host "Скачивание cloudflared..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.gemini\bin" | Out-Null
    Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $Cloudflared
}

Write-Host "Запуск публичного защищенного туннеля (HTTPS)..." -ForegroundColor Green
& $Cloudflared tunnel --protocol http2 --http-host-header localhost:5173 --url http://localhost:5173
