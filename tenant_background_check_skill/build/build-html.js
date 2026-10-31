import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const { version } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
// The AI side compares a summary's checker version against SKILL.md, so all three must agree.
const others = {
  'SKILL.md': readFileSync(new URL('SKILL.md', root), 'utf8').match(/^\s+version:\s*(\S+)/m)?.[1],
  '.claude-plugin/plugin.json': JSON.parse(readFileSync(new URL('.claude-plugin/plugin.json', root), 'utf8')).version,
};
const stale = Object.entries(others).filter(([, v]) => v !== version).map(([file, v]) => `${file} has ${v}`);
if (stale.length) throw new Error(`Version mismatch: package.json has ${version}, ${stale.join(', ')}`);
const NODE_ONLY = ['canvas', 'fs', 'path', 'url', 'module', 'zlib', 'http', 'https', 'stream', 'os', 'worker_threads', 'node:*'];

const result = await build({
  entryPoints: [new URL('src/web/main.js', root).pathname],
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, write: false,
  loader: { '.json': 'json' }, external: NODE_ONLY, logLevel: 'warning',
  define: { __TBC_VERSION__: JSON.stringify(version) },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(new URL('src/web/index.html', root), 'utf8')
  .replace('<!-- APP_SCRIPT -->', () => `<script type="module">${js}</script>`);
mkdirSync(new URL('dist', root), { recursive: true });
writeFileSync(new URL('dist/checker.html', root), html);
console.log(`dist/checker.html v${version} ${(html.length / 1024).toFixed(0)} KB`);
