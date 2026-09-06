import fs from 'fs';
fs.mkdirSync('./dist', { recursive: true });
fs.copyFileSync('./src/index.tsx', './dist/index.js');
fs.copyFileSync('./manifest.json', './dist/manifest.json');
console.log('✅ Build completo!');
