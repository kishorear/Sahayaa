import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const pkg = JSON.parse(
  require('fs').readFileSync('./package.json', 'utf8')
);

const banner = `/*!
 * @sahayaa/widget v${pkg.version}
 * Embeddable Sahayaa AI chat widget
 * (c) ${new Date().getFullYear()} Sahayaa AI
 * Released under the MIT License
 */`;

const basePlugins = [
  resolve({ browser: true }),
  commonjs(),
  typescript({ tsconfig: './tsconfig.json', declarationDir: 'dist' }),
];

export default [
  // ESM build (for bundlers / npm import)
  {
    input: 'src/index.ts',
    output: {
      file: pkg.module,
      format: 'esm',
      banner,
      sourcemap: true,
    },
    plugins: basePlugins,
  },

  // CJS build (for Node.js / require())
  {
    input: 'src/index.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      exports: 'auto',
      banner,
      sourcemap: true,
    },
    plugins: basePlugins,
  },

  // UMD build (for CDN / script tag)
  {
    input: 'src/index.ts',
    output: {
      file: pkg.browser,
      format: 'umd',
      name: 'SahayaaWidget',
      banner,
      sourcemap: false,
    },
    plugins: [
      ...basePlugins,
      terser({ format: { comments: /^!/ } }),
    ],
  },
];
