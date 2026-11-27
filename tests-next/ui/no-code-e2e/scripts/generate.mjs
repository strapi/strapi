// @ts-check
/**
 * Generates the ui specs of the scenarios that need one, one scenario at a time.
 *
 *   node tests-next/ui/no-code-e2e/scripts/generate.mjs --report <report.json> [--only <id>...]
 *     [--model <alias>]
 *
 * For each scenario: the agent writes the spec (and Page Objects or schema when needed), this
 * script stamps the spec's header, runs it `repeatEach` times and checks the diff. A green spec is
 * committed locally; a failed attempt is retried with its failure, then escalated once to the
 * stronger model; a scenario that still fails is rolled back. Then the whole ui suite runs once.
 *
 * Commits are local: the workflow pushes them. Exit code 1 when anything failed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { editingTools, prompt, runClaude } from './claude.mjs';
import { changesSince, changedFilesSince, commit, head, resetTo } from './git.mjs';
import { checkChanges, loadConfig, matchesAny, plan, REPO_ROOT, withSpecHeader } from './lib.mjs';
import { lintChanged } from './lint.mjs';
import { renderReport } from './report.mjs';
import { runSpecs } from './run-spec.mjs';

const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['generated', 'refused', 'needs_clarification'] },
    reason: { type: 'string', description: 'Why, in one or two sentences, in English.' },
    files: { type: 'array', items: { type: 'string' }, description: 'Files created or changed.' },
  },
  required: ['status', 'reason'],
  additionalProperties: false,
};

const { values } = parseArgs({
  options: {
    report: { type: 'string' },
    only: { type: 'string', multiple: true },
    model: { type: 'string' },
  },
});
if (!values.report) {
  console.error('Usage: generate.mjs --report <report.json> [--only <id>...] [--model <alias>]');
  process.exit(2);
}

const config = loadConfig();
const suitePaths = [config.paths.suite];
const base = head();
const work = plan(config);

/** @type {import('./report.mjs').Report} */
const report = {
  mode: 'generate',
  base,
  entries: [],
  lint: work.lint,
  suite: { ran: false, ok: true },
  diffCheck: { ok: true, violations: [] },
  notes: [],
};
const save = () => {
  const file = /** @type {string} */ (values.report);
  mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  writeFileSync(file, JSON.stringify(report, null, 2));
};
const log = (/** @type {string} */ message) => console.log(`[no-code-e2e] ${message}`);

let failed = work.lint.some((item) => item.errors.length > 0);

// Specs whose scenario was deleted.
for (const orphan of work.orphans) {
  rmSync(path.join(REPO_ROOT, orphan));
  report.entries.push({
    id: path.basename(orphan, '.ui-test.ts'),
    file: orphan,
    status: 'deleted',
    attempts: [],
  });
}
if (work.orphans.length)
  commit('test(tests-next): delete the specs of removed scenarios', suitePaths);

for (const { scenario, reason } of work.skipped) {
  report.entries.push({
    id: scenario.meta.id,
    file: scenario.file,
    status: 'skipped',
    reason,
    attempts: [],
  });
}

const queue = values.only?.length
  ? work.toGenerate.filter((scenario) => values.only?.includes(scenario.meta.id))
  : work.toGenerate;

if (queue.length) {
  // Generates the app and builds its admin once, before any token is spent: the agents' runs then
  // reuse them, and a broken environment stops here.
  log('Warm-up: preparing the ui app');
  const warmUp = await runSpecs({ specs: ['tests/app/browser.ui-test.ts'] });
  if (warmUp.code !== 0) {
    report.notes.push('Preparing the test app failed: no agent was started.');
    report.suite = { ran: true, ok: false, output: warmUp.report.slice(-4000) };
    save();
    console.log(warmUp.report);
    process.exit(1);
  }
}

for (const scenario of queue) {
  const id = scenario.meta.id;
  const specFile = path.join(REPO_ROOT, scenario.spec);
  const regenerating = existsSync(specFile);
  const before = head();
  /** @type {import('./report.mjs').Entry} */
  const entry = { id, file: scenario.file, spec: scenario.spec, status: 'failed', attempts: [] };
  report.entries.push(entry);
  log(`Scenario ${id} → ${scenario.spec}`);

  const attempts = [
    ...Array.from({ length: config.attempts.generate }, () => /** @type {const} */ ('generate')),
    /** @type {const} */ ('escalate'),
  ];
  let feedback = '';

  for (const task of attempts) {
    const model = task === 'generate' && values.model ? values.model : config.models[task];
    const result = await runClaude({
      prompt: prompt('generate.md', {
        context: prompt('context.md'),
        scenarioFile: scenario.file,
        scenario: scenario.content,
        specFile: scenario.spec,
        scratchDir: config.paths.scratch,
        regenerating: regenerating
          ? 'The spec already exists (the scenario changed): update it to match the new scenario.'
          : 'The spec does not exist yet.',
        feedback: feedback
          ? `## Previous attempt\n\nThe previous attempt failed. Fix it, starting from the files as they are:\n\n\`\`\`\n${feedback}\n\`\`\``
          : '',
      }),
      model,
      maxTurns: config.maxTurns[task],
      maxBudgetUsd: config.maxBudgetUsd[task],
      allowedTools: editingTools(config.allowedPaths.generate),
      schema: ANSWER_SCHEMA,
    });
    const attempt = {
      task,
      model,
      costUsd: result.costUsd,
      turns: result.turns,
      outcome: result.stop,
    };
    entry.attempts.push(attempt);
    if (result.denials.length) log(`Denied tool calls: ${result.denials.join(' | ')}`);
    rmSync(path.join(REPO_ROOT, config.paths.scratch), { recursive: true, force: true });

    const status = /** @type {string | undefined} */ (result.answer?.status);
    if (status === 'refused' || status === 'needs_clarification') {
      // Nothing to keep: a refused scenario gets no spec.
      resetTo(before, suitePaths);
      entry.status = status;
      entry.reason = String(result.answer?.reason ?? '');
      attempt.outcome = status;
      break;
    }

    if (!existsSync(specFile)) {
      attempt.outcome = result.ok ? 'no-spec' : result.stop;
      feedback = `No spec was written to ${scenario.spec}. ${result.text.slice(-1500)}`;
      continue;
    }

    writeFileSync(specFile, withSpecHeader(readFileSync(specFile, 'utf8'), scenario));
    prettier(changedFilesSince(before));

    const violations = checkChanges({
      mode: 'generate',
      changes: changesSince(before),
      config,
      regenerated: regenerating ? [scenario.spec] : [],
    });
    if (violations.length) {
      attempt.outcome = 'diff-refused';
      feedback = `The diff check refused these changes, fix them:\n${violations.join('\n')}`;
      continue;
    }

    const lint = lintChanged(before);
    if (!lint.ok) {
      attempt.outcome = 'lint';
      feedback = `ESLint fails on the changed files, fix them:\n${lint.output.slice(-4000)}`;
      continue;
    }

    const run = await runSpecs({ specs: [scenario.spec], repeatEach: config.repeatEach });
    if (run.code !== 0) {
      attempt.outcome = 'red';
      feedback = `The spec fails with --repeat-each=${config.repeatEach}:\n${run.report.slice(-6000)}`;
      continue;
    }

    commit(`test(tests-next): generate ${id} from its scenario`, suitePaths);
    entry.status = 'generated';
    entry.reason = String(result.answer?.reason ?? '');
    attempt.outcome = 'green';
    break;
  }

  if (entry.status === 'failed') {
    resetTo(before, suitePaths);
    entry.reason = 'No attempt produced a green, stable spec.';
    failed = true;
  }
  save();
}

// The whole ui suite, once: generated specs share the worker's app with the other files, and an
// agent may have changed Page Objects or the schema they use.
if (head() !== base) {
  const touchedShared = changedFilesSince(base).filter((file) =>
    matchesAny(file, config.nonRegressionPaths)
  );
  log(
    `Whole ui suite${touchedShared.length ? ` (shared files changed: ${touchedShared.join(', ')})` : ''}`
  );
  const suite = await runSpecs({ specs: [], all: true });
  report.suite = { ran: true, ok: suite.code === 0, output: suite.report.slice(-4000) };
  if (suite.code !== 0) {
    failed = true;
    console.log(suite.report);
  }

  // Last guard, on everything this run committed.
  const violations = checkChanges({
    mode: 'generate',
    changes: changesSince(base),
    config,
    regenerated: report.entries
      .filter((entry) => entry.status === 'generated')
      .map((entry) => entry.spec ?? ''),
  });
  if (violations.length) {
    report.diffCheck = { ok: false, violations };
    resetTo(base, suitePaths);
    failed = true;
  }
}

save();
console.log(renderReport(report));
process.exit(failed ? 1 : 0);

/** Formats the changed files with the repo's Prettier config. */
function prettier(/** @type {string[]} */ files) {
  const targets = files.filter(
    (file) => /\.(ts|js|mjs|json)$/.test(file) && existsSync(path.join(REPO_ROOT, file))
  );
  if (!targets.length) return;
  try {
    execFileSync('yarn', ['prettier', '--write', '--log-level=warn', ...targets], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
  } catch (error) {
    log(`Prettier failed: ${error}`);
  }
}
