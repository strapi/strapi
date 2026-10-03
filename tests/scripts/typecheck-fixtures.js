'use strict';

/**
 * Typechecks the hand-written type fixtures under `tests/api` that no other CI job covers.
 *
 * `tests/api` runs through SWC (transpile-only) and is not part of any Nx `test:ts*` project,
 * so nothing otherwise compiles these files. That is precisely how the component declarations
 * silently degraded: the legacy `Schema.Component` + top-level `Attribute` form stopped
 * resolving, every interface fell back to `any`, and the `Required` markers the runtime
 * fixtures depend on became inert.
 *
 * Catching that requires `--skipLibCheck false`, because the degradation shows up as TS2312 /
 * TS2305 *inside the `.d.ts`* — which `skipLibCheck` drops by design. That flag also surfaces
 * pre-existing errors inside `@strapi/types`' own `dist`, which are unrelated to these
 * fixtures and not this job's business, so diagnostics are filtered to the fixture directory.
 */

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const FIXTURE_DIR = 'tests/api/core/strapi/document-service/resources/types';
const ENTRYPOINTS = [path.join(FIXTURE_DIR, 'components.probe.ts')];

const TSC_ARGS = [
  '--noEmit',
  '--strict',
  '--skipLibCheck',
  'false',
  '--moduleResolution',
  'node16',
  '--module',
  'node16',
  '--target',
  'es2022',
];

let output = '';
try {
  execFileSync('npx', ['tsc', ...TSC_ARGS, ...ENTRYPOINTS], {
    cwd: path.resolve(__dirname, '..', '..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
}

const relevant = output
  .split('\n')
  .filter((line) => line.startsWith(FIXTURE_DIR))
  .filter((line) => / error TS\d+:/.test(line));

if (relevant.length > 0) {
  console.error('Type fixture check failed:\n');
  console.error(relevant.join('\n'));
  console.error(
    `\n${relevant.length} error(s) in ${FIXTURE_DIR}. These declarations back runtime API ` +
      'test fixtures — a degraded declaration makes their `Required` markers inert.'
  );
  process.exit(1);
}

console.log(`Type fixtures OK (${ENTRYPOINTS.length} entrypoint(s), no errors in ${FIXTURE_DIR}).`);
