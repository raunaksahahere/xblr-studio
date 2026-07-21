# Refresh Production Release ZIP Archive
$stage = "C:\Users\Prian\AppData\Local\Temp\ai-xbrl-stage"
$zip = "C:\Users\Prian\.gemini\antigravity\scratch\ai-xbrl-studio-release.zip"

if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
if (Test-Path $zip) { Remove-Item $zip }

robocopy "C:\Users\Prian\.gemini\antigravity\scratch\ai-xbrl-studio" $stage /E /XD node_modules node-env .git dist build_zip.ps1
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip)
Remove-Item -Recurse -Force $stage

Write-Host "ZIP Created Successfully at $zip"
