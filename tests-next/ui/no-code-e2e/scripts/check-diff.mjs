// @ts-check
/**
 * Checks the changes since a ref against the agents' rules (allowed paths, no skip, no removed
 * assertion…). generate.mjs and heal.mjs run the same check; this CLI is for a manual check.
 *
 *   node tests-next/ui/no-code-e2e/scripts/check-diff.mjs --mode generate|heal --base <ref>
 *     [--regenerated <spec>...]
 */
import { parseArgs } from 'node:util';

import { changesSince } from './git.mjs';
import { checkChanges, loadConfig } from './lib.mjs';

const { values } = parseArgs({
  options: {
    mode: { type: 'string' },
    base: { type: 'string' },
    regenerated: { type: 'string', multiple: true },
  },
});
if ((values.mode !== 'generate' && values.mode !== 'heal') || !values.base) {
  console.error(
    'Usage: check-diff.mjs --mode generate|heal --base <ref> [--regenerated <spec>...]'
  );
  process.exit(2);
}

const violations = checkChanges({
  mode: values.mode,
  changes: changesSince(values.base),
  config: loadConfig(),
  regenerated: values.regenerated ?? [],
});
for (const violation of violations) console.log(`✖ ${violation}`);
console.log(violations.length ? `${violations.length} violation(s).` : 'Diff allowed.');
process.exit(violations.length ? 1 : 0);
