# sync-brain.ps1 - Synchronizes Antigravity AppData brain to local project .agents/brain

$AppBrainDir = "$env:USERPROFILE\.gemini\antigravity\brain"
$LocalBrainDir = Join-Path $PSScriptRoot "..\brain"

if (-not (Test-Path $AppBrainDir)) {
    Write-Host "No Antigravity brain directory found at $AppBrainDir" -ForegroundColor Yellow
    exit 0
}

Write-Host "Syncing Antigravity brain from $AppBrainDir to $LocalBrainDir..." -ForegroundColor Cyan

# Sync all conversation folders
Get-ChildItem -Path $AppBrainDir -Directory | ForEach-Object {
    $targetDir = Join-Path $LocalBrainDir $_.Name
    Write-Host "  -> Syncing conversation $($_.Name)..."
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
    Copy-Item -Path "$($_.FullName)\*" -Destination $targetDir -Recurse -Force
}

# Update top-level artifacts and screenshots shortcuts
$artifactsDir = Join-Path $LocalBrainDir "artifacts"
$screenshotsDir = Join-Path $LocalBrainDir "screenshots"

if (-not (Test-Path $artifactsDir)) { New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null }
if (-not (Test-Path $screenshotsDir)) { New-Item -ItemType Directory -Force -Path $screenshotsDir | Out-Null }

Get-ChildItem -Path $AppBrainDir -Recurse -Include *.md, *.html | Where-Object { $_.FullName -notmatch "\.agents" } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $artifactsDir -Force
}

Get-ChildItem -Path $AppBrainDir -Recurse -Include *.png | Where-Object { $_.FullName -notmatch "\.agents" } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $screenshotsDir -Force
}

Write-Host "Brain sync complete successfully!" -ForegroundColor Green
