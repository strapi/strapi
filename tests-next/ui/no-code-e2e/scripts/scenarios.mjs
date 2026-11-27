// @ts-check
/**
 * Lints the scenarios and says what a generation run would do. No model call, no dependency:
 * the workflow runs it before installing anything, and QA engineers can run it locally.
 *
 *   node tests-next/ui/no-code-e2e/scripts/scenarios.mjs
 *
 * Exit code 1 when a scenario is invalid. In GitHub Actions, writes the `generate` output
 * (`true` when a spec needs generating or deleting).
 */
import { appendFileSync } from 'node:fs';

import { loadConfig, plan } from './lib.mjs';

const work = plan(loadConfig());
let errors = 0;

for (const { file, errors: fileErrors, warnings } of work.lint) {
  if (!fileErrors.length && !warnings.length) continue;
  console.log(file);
  for (const error of fileErrors) console.log(`  ✖ ${error}`);
  for (const warning of warnings) console.log(`  ⚠ ${warning}`);
  errors += fileErrors.length;
}

console.log('');
console.log(
  `À générer   : ${work.toGenerate.map((scenario) => scenario.meta.id).join(', ') || '—'}`
);
console.log(`À jour      : ${work.upToDate.map((scenario) => scenario.meta.id).join(', ') || '—'}`);
console.log(
  `Ignorés     : ${work.skipped.map(({ scenario, reason }) => `${scenario.meta.id} (${reason})`).join(', ') || '—'}`
);
console.log(`À supprimer : ${work.orphans.join(', ') || '—'}`);

const hasWork = work.toGenerate.length > 0 || work.orphans.length > 0;
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `generate=${hasWork}\n`);

if (errors) {
  console.log(`\n${errors} erreur(s) : corrige les scénarios ci-dessus.`);
  process.exit(1);
}
