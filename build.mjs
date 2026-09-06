import fs from 'fs';
fs.mkdirSync('./dist', { recursive: true });
fs.copyFileSync('./src/index.tsx', './dist/index.js');
fs.copyFileSync('./src/index.html', './dist/index.html');
fs.copyFileSync('./manifest.json', './dist/manifest.json');
console.log('✅ Build completo!');
