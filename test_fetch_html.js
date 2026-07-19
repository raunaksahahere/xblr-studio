const BaseUrl = 'https://xbrlstudio.lovable.app';

async function run() {
  try {
    const res = await fetch(BaseUrl);
    const html = await res.text();
    console.log('=== HTML Source ===');
    console.log(html.substring(0, 2000)); // Print first 2000 chars

    // Look for script tags
    const scriptRegex = /<script\b[^>]*src="([^"]*)"/gi;
    let match;
    console.log('\n=== Javascript Assets ===');
    while ((match = scriptRegex.exec(html)) !== null) {
      console.log(match[1]);
    }
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

run();
