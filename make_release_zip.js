const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = path.resolve(__dirname);
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\Prian', 'Downloads');
const zipPath = path.join(downloadsDir, 'ai-xbrl-studio-release.zip');
const oldScratchZip = 'C:\\Users\\Prian\\.gemini\\antigravity\\scratch\\ai-xbrl-studio-release.zip';
const stageDir = path.join(process.env.TEMP || 'C:\\Users\\Prian\\AppData\\Local\\Temp', 'ai-xbrl-release-stage');

const excludeDirs = new Set(['node_modules', 'node-env', '.git', 'dist']);

console.log('[ZipBuilder] Cleaning old scratch archive if present...');
if (fs.existsSync(oldScratchZip)) {
  try {
    fs.rmSync(oldScratchZip, { force: true });
    console.log('[ZipBuilder] Removed old scratch zip.');
  } catch (e) {}
}

console.log('[ZipBuilder] Preparing staging directory...');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
if (fs.existsSync(zipPath)) {
  fs.rmSync(zipPath, { force: true });
}

fs.mkdirSync(stageDir, { recursive: true });

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    const baseName = path.basename(src);
    if (excludeDirs.has(baseName)) return;
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('[ZipBuilder] Copying project files to staging area...');
copyRecursive(sourceDir, stageDir);

console.log('[ZipBuilder] Creating release ZIP package in Downloads...');
try {
  const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${stageDir}', '${zipPath}')"`;
  execSync(psCmd, { stdio: 'inherit' });
  console.log(`[ZipBuilder] SUCCESS! Release package generated at: ${zipPath}`);
} catch (err) {
  console.error('[ZipBuilder] PowerShell ZIP creation notice:', err.message);
} finally {
  if (fs.existsSync(stageDir)) {
    try {
      fs.rmSync(stageDir, { recursive: true, force: true });
    } catch (e) {}
  }
}
