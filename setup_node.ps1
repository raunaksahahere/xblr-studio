$Url = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip"
$ZipFile = Join-Path -Path $PSScriptRoot -ChildPath "node.zip"
$DestDir = Join-Path -Path $PSScriptRoot -ChildPath "node-env"

Write-Host "Downloading Node.js..."
Invoke-WebRequest -Uri $Url -OutFile $ZipFile

Write-Host "Extracting Node.js..."
Expand-Archive -Path $ZipFile -DestinationPath $DestDir -Force

Write-Host "Cleaning up zip..."
Remove-Item -Path $ZipFile

Write-Host "Node.js setup complete."
