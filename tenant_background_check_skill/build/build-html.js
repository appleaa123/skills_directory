import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const NODE_ONLY = ['canvas', 'fs', 'path', 'url', 'module', 'zlib', 'http', 'https', 'stream', 'os', 'worker_threads', 'node:*'];

const result = await build({
  entryPoints: [new URL('src/web/main.js', root).pathname],
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, write: false,
  loader: { '.json': 'json' }, external: NODE_ONLY, logLevel: 'warning',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(new URL('src/web/index.html', root), 'utf8')
  .replace('<!-- APP_SCRIPT -->', () => `<script type="module">${js}</script>`);
mkdirSync(new URL('dist', root), { recursive: true });
writeFileSync(new URL('dist/checker.html', root), html);
console.log(`dist/checker.html ${(html.length / 1024).toFixed(0)} KB`);
