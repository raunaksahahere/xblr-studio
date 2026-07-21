const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname);
const zipPath = 'C:\\Users\\Prian\\.gemini\\antigravity\\scratch\\ai-xbrl-studio-release.zip';
const stageDir = 'C:\\Users\\Prian\\AppData\\Local\\Temp\\ai-xbrl-stage';

console.log('[MakeZip] Cleaning previous staging directory and zip archive...');

try {
  if (fs.existsSync(stageDir)) {
    fs.rmSync(stageDir, { recursive: true, force: true });
  }
  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath, { force: true });
  }
} catch (e) {
  console.log('[MakeZip] Warning during cleanup:', e.message);
}

console.log('[MakeZip] Copying project files using Robocopy...');
try {
  execSync(`robocopy "${rootDir}" "${stageDir}" /E /XD node_modules node-env .git dist`, { stdio: 'inherit' });
} catch (e) {
  // Robocopy returns exit code 1 when files are copied, which Node execSync treats as non-zero
}

console.log('[MakeZip] Compressing staging directory to release zip...');
const psCommand = `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${stageDir}', '${zipPath}')"`;
execSync(psCommand, { stdio: 'inherit' });

try {
  fs.rmSync(stageDir, { recursive: true, force: true });
} catch (e) {}

console.log(`[MakeZip] SUCCESS! Production ZIP updated at: ${zipPath}`);
