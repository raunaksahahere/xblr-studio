const BaseUrl = 'https://xbrlstudio.lovable.app';
const fs = require('fs');

async function run() {
  try {
    const res = await fetch(`${BaseUrl}/assets/mock-data-CEn2WbGz.js`);
    const code = await res.text();
    fs.writeFileSync('mock-data-CEn2WbGz.js', code);
    console.log('✔ Downloaded assets/mock-data-CEn2WbGz.js');
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

run();
