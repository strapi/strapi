import { spawnSync } from 'node:child_process';
import path from 'node:path';

const TSC_PATH = require.resolve('typescript/bin/tsc');
const HEAP_LIMIT_MB = 1024;

export const COMPILE_TIMEOUT_MS = 60_000;

/**
 * Type-checks the fixture in `resources/<fixtureName>` on its own, with a capped heap
 */
export const compileFixture = (fixtureName: string) => {
  const result = spawnSync(
    process.execPath,
    [
      `--max-old-space-size=${HEAP_LIMIT_MB}`,
      TSC_PATH,
      '--project',
      path.join(__dirname, 'resources', fixtureName, 'tsconfig.json'),
      '--extendedDiagnostics',
    ],
    { encoding: 'utf8', timeout: COMPILE_TIMEOUT_MS }
  );

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const instantiations = output.match(/^Instantiations:\s+(\d+)$/m);

  return {
    status: result.status,
    signal: result.signal,
    output,
    instantiations: instantiations === null ? undefined : Number(instantiations[1]),
  };
};
