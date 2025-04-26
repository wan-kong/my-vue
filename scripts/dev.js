import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import esbuild from 'esbuild';
import { createRequire } from 'node:module';

console.log('开始打包');

/**
 * 解析命令行参数
 */
const {
  values: { format },
  positionals,
} = parseArgs({
  allowPositionals: true,
  options: {
    format: {
      type: 'string',
      short: 'f',
      default: 'esm',
    },
  },
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const target = positionals.length ? positionals[0] : 'vue';

const entry = resolve(__dirname, `../packages/${target}/src/index.ts`);

const outfile = resolve(
  __dirname,
  `../packages/${target}/dist/${target}.${format}.js`,
);

const pkg = require(`../packages/${target}/package.json`);

esbuild
  .context({
    entryPoints: [entry],
    outfile: outfile,
    format,
    platform: format === 'cjs' ? 'node' : 'browser',
    sourcemap: true,
    bundle: true,
    globalName: pkg.buildOptions.name,
  })
  .then(ctx => {
    ctx.watch();
  });
