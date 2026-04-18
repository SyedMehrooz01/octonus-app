const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const buffer = execFileSync('git', ['show', '30240df:public/letterhead.jpg.jpeg'], { encoding: 'buffer' });
  fs.writeFileSync(path.join(__dirname, 'public', 'letterhead.jpg'), buffer);
  console.log('✅ Successfully wrote letterhead.jpg to public folder!');
} catch (e) {
  console.error('❌ Error:', e);
}
