import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const output = join(process.cwd(), 'dist-pages');
process.env.PUBLIC_BASE_PATH = '/novaya-palmira';

await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'assets'), { recursive: true });

const build = await Bun.build({
  entrypoints: [join(process.cwd(), 'src/client.tsx')],
  outdir: join(output, 'assets'),
  target: 'browser',
  minify: true,
  external: ['/fonts/*'],
});

if (!build.success) {
  for (const log of build.logs) console.error(log);
  process.exit(1);
}

const cssPath = join(output, 'assets', 'client.css');
const css = await Bun.file(cssPath).text();
await Bun.write(cssPath, css.replaceAll('/fonts/', '../fonts/'));

for (const entry of await readdir(join(process.cwd(), 'public'))) {
  await cp(join(process.cwd(), 'public', entry), join(output, entry), { recursive: true });
}

const { html } = await import('../src/server');
const { pages } = await import('../src/data');

for (const page of pages) {
  const target = page.path === '/' ? output : join(output, page.path.slice(1));
  await mkdir(target, { recursive: true });
  await Bun.write(join(target, 'index.html'), html(page.path));
}

await Bun.write(join(output, '404.html'), html('/404'));
await Bun.write(join(output, '.nojekyll'), '');

console.log(`GitHub Pages build: ${pages.length} страниц в ${output}`);
