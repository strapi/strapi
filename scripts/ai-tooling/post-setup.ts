import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error - no .ts extension import
import { hasMissingLinks, SETUP_HINT_LINES } from './links.ts';

// @ts-expect-error - import.meta.url is not supported in commonjs context
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');

if (hasMissingLinks(repoRoot) === true) {
  for (const line of SETUP_HINT_LINES) {
    console.log(line);
  }
}
