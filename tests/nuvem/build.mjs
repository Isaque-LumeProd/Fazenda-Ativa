import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Empacota o código de sincronização do app 3 vezes (3 "aparelhos"), trocando Supabase, React Native
// e AsyncStorage por versões de teste (pasta stubs/).
const aqui = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(aqui, '../..');
for (const dev of ['a', 'b', 'c']) {
  await build({
    entryPoints: [path.join(aqui, 'entry.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: path.join(aqui, `out/dev-${dev}.mjs`),
    logLevel: 'error',
    define: { DEVICE: JSON.stringify(dev) },
    nodePaths: [path.join(APP, 'node_modules')],
    plugins: [
      {
        name: 'app',
        setup(b) {
          b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: path.join(aqui, 'stubs/supabase.js') }));
          b.onResolve({ filter: /^react-native$/ }, () => ({ path: path.join(aqui, 'stubs/rn.js') }));
          b.onResolve({ filter: /^@react-native-async-storage\/async-storage$/ }, () => ({
            path: path.join(aqui, 'stubs/storage.js'),
          }));
        },
      },
    ],
  });
}
console.log('Pacotes de teste gerados');
