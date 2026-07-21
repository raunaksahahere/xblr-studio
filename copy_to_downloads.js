const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname);
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\Prian', 'Downloads');
const targetDir = path.join(downloadsDir, 'ai-xbrl-studio');

const excludeDirs = new Set(['node_modules', 'node-env', '.git', 'dist']);

console.log(`[DeployHelper] Copying complete production codebase to Downloads: ${targetDir}`);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function copyFolderRecursiveSync(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    const baseName = path.basename(src);
    if (excludeDirs.has(baseName)) return;
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyFolderRecursiveSync(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyFolderRecursiveSync(sourceDir, targetDir);
console.log(`[DeployHelper] SUCCESS! Full production codebase copied to Downloads folder: ${targetDir}`);
