// Bundles a TypeScript entry point to ESM for headless Node execution.
//
// The castle code uses `import.meta.env.BASE_URL` (a Vite define) and .ts
// extensionless imports, so it can't be run by Node directly. esbuild handles
// both in a few milliseconds, which keeps the verification loop fast enough to
// run on every change.

import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Bundle `entry` and return its source text.
 * Babylon itself is left external so it resolves to the same installed copy
 * the app uses — otherwise every bundle would inline a second copy.
 */
export async function bundleToSource(entry, { root }) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    external: ['@babylonjs/*'],
    loader: { '.ts': 'ts', '.tsx': 'tsx' },
    absWorkingDir: root,
    define: {
      'import.meta.env.BASE_URL': '"/"',
      'import.meta.env.DEV': 'false',
      'import.meta.env.PROD': 'true',
    },
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

/** Write the bundle next to a temp name inside the project and import it. */
export async function importBundled(entry, { root, tmpDir }) {
  const source = await bundleToSource(entry, { root });
  const outfile = path.join(tmpDir, `${path.basename(entry, path.extname(entry))}-${Date.now()}.mjs`);
  const { writeFile, mkdir } = await import('node:fs/promises');
  await mkdir(tmpDir, { recursive: true });
  await writeFile(outfile, source, 'utf8');
  return { module: await import(`file://${outfile}`), outfile, source };
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}
