const fs = require('fs');
const path = require('path');

const apiFile = fs.readFileSync(path.join(__dirname, 'backend/src/routes/api.ts'), 'utf8');
const lines = apiFile.split('\n');

console.log('--- Route Permissions Audit ---');
for (const line of lines) {
  if (line.includes('router.') && !line.includes('router.use')) {
    console.log(line.trim());
  }
}
