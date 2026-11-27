// @ts-check
/**
 * Heals the generated ui specs that fail, or reports why it can't.
 *
 *   node tests-next/ui/no-code-e2e/scripts/heal.mjs --report <report.json> [--only <spec>...]
 *
 * 1. Runs the generated specs. Green: nothing to do.
 * 2. Runs each failing spec again: green this time means flaky (Linear issue, no fix).
 * 3. Triage (cheap model, read-only): `locator` (the UI moved, the behaviour didn't),
 *    `assertion` (the behaviour changed: possible regression) or `environment`.
 * 4. `locator`: the healer fixes Page Objects or the spec's steps, never an assertion. Kept only
 *    when the spec is green `repeatEach` times and the diff check passes. Otherwise, or for an
 *    `assertion`, a Linear issue.
 *
 * Fixes are local commits: the workflow pushes them to a branch and opens a PR.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { editingTools, prompt, readOnlyTools, runClaude } from './claude.mjs';
import { changesSince, commit, git, head, resetTo } from './git.mjs';
import { reportIssue } from './linear.mjs';
import { checkChanges, loadConfig, readSpecHeader, REPO_ROOT } from './lib.mjs';
import { renderReport } from './report.mjs';
import { runSpecs } from './run-spec.mjs';

const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['locator', 'assertion', 'environment'] },
    explanation: { type: 'string', description: 'In English, 2 to 4 sentences.' },
    expected: { type: 'string', description: 'What the scenario expects.' },
    actual: { type: 'string', description: 'Ce que la page montre.' },
  },
  required: ['verdict', 'explanation'],
  additionalProperties: false,
};

const HEAL_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['healed', 'cannot_heal'] },
    reason: { type: 'string', description: 'In English, one or two sentences.' },
  },
  required: ['status', 'reason'],
  additionalProperties: false,
};

const { values } = parseArgs({
  options: { report: { type: 'string' }, only: { type: 'string', multiple: true } },
});
if (!values.report) {
  console.error('Usage: heal.mjs --report <report.json> [--only <spec>...]');
  process.exit(2);
}

const config = loadConfig();
const suitePaths = [config.paths.suite];
const base = head();
const runUrl = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : '';

/** @type {import('./report.mjs').Report} */
const report = {
  mode: 'heal',
  base,
  entries: [],
  lint: [],
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
let failed = false;

// 1. The generated specs. None yet (the generation hasn't run): nothing to heal, and Playwright
// would fail on "No tests found".
const hasSpecs = (/** @type {string} */ dir) =>
  existsSync(dir) &&
  readdirSync(dir, { recursive: true }).some((name) => String(name).endsWith('.ui-test.ts'));
if (!values.only?.length && !hasSpecs(path.join(REPO_ROOT, config.paths.generated))) {
  report.notes.push('No generated spec yet: nothing to check.');
  save();
  console.log(renderReport(report));
  process.exit(0);
}

const jsonOutput = path.join(tmpdir(), 'no-code-e2e-heal.json');
const first = await runSpecs({
  specs: values.only?.length ? values.only : [config.paths.generated],
  jsonOutput,
});
report.suite = { ran: true, ok: first.code === 0 };
const failing = first.code === 0 ? [] : failingFiles(jsonOutput);
if (first.code !== 0 && failing.length === 0) {
  report.notes.push('The run failed without a failing test to point at (setup?): see the job.');
  report.suite.output = first.report.slice(-4000);
  failed = true;
}
log(`${failing.length} failing generated spec(s)`);

for (const spec of failing) {
  const header = readSpecHeader(readFileSync(path.join(REPO_ROOT, spec), 'utf8'));
  const scenarioFile = header?.scenario ?? '';
  const scenario = existsSync(path.join(REPO_ROOT, scenarioFile))
    ? readFileSync(path.join(REPO_ROOT, scenarioFile), 'utf8')
    : '';
  const id = header?.id ?? path.basename(spec, '.ui-test.ts');
  const title = /^#\s+(.+)$/m.exec(scenario)?.[1] ?? id;
  /** @type {import('./report.mjs').Entry} */
  const entry = { id, file: scenarioFile, spec, status: 'failed', attempts: [] };
  report.entries.push(entry);

  // 2. Flaky?
  const again = await runSpecs({ specs: [spec] });
  if (again.code === 0) {
    entry.status = 'flaky';
    entry.reason = 'Failed, then passed with no change.';
    entry.link = await issue(
      id,
      `Flaky test: ${title}`,
      describe({ spec, scenarioFile, verdict: 'flaky', failure: first.report })
    );
    save();
    continue;
  }

  // 3. Triage.
  const triage = await runClaude({
    prompt: prompt('triage.md', {
      context: prompt('context.md'),
      scenarioFile,
      scenario,
      specFile: spec,
      failure: again.report.slice(-8000),
      commits: recentCommits(),
    }),
    model: config.models.triage,
    maxTurns: config.maxTurns.triage,
    maxBudgetUsd: config.maxBudgetUsd.triage,
    allowedTools: readOnlyTools(),
    schema: TRIAGE_SCHEMA,
  });
  const verdict = String(triage.answer?.verdict ?? 'environment');
  entry.attempts.push({
    task: 'triage',
    model: config.models.triage,
    costUsd: triage.costUsd,
    turns: triage.turns,
    outcome: verdict,
  });
  const explanation = String(triage.answer?.explanation ?? triage.text.slice(-500));

  if (verdict === 'assertion') {
    entry.status = 'regression';
    entry.reason = explanation;
    entry.link = await issue(
      id,
      `Possible regression: ${title}`,
      describe({
        spec,
        scenarioFile,
        verdict,
        failure: again.report,
        explanation,
        expected: triage.answer?.expected,
        actual: triage.answer?.actual,
      })
    );
    save();
    continue;
  }
  if (verdict !== 'locator') {
    entry.status = 'environment';
    entry.reason = explanation;
    failed = true;
    save();
    continue;
  }

  // 4. Heal.
  const before = head();
  const heal = await runClaude({
    prompt: prompt('heal.md', {
      context: prompt('context.md'),
      scenarioFile,
      scenario,
      specFile: spec,
      failure: again.report.slice(-8000),
      triage: explanation,
      scratchDir: config.paths.scratch,
    }),
    model: config.models.heal,
    maxTurns: config.maxTurns.heal,
    maxBudgetUsd: config.maxBudgetUsd.heal,
    allowedTools: editingTools(config.allowedPaths.heal),
    schema: HEAL_SCHEMA,
  });
  const attempt = {
    task: 'heal',
    model: config.models.heal,
    costUsd: heal.costUsd,
    turns: heal.turns,
    outcome: heal.stop,
  };
  entry.attempts.push(attempt);
  if (heal.denials.length) log(`Denied tool calls: ${heal.denials.join(' | ')}`);
  rmSync(path.join(REPO_ROOT, config.paths.scratch), { recursive: true, force: true });

  const violations = checkChanges({ mode: 'heal', changes: changesSince(before), config });
  const verified =
    violations.length === 0 && heal.answer?.status === 'healed'
      ? (await runSpecs({ specs: [spec], repeatEach: config.repeatEach })).code === 0
      : false;

  if (verified && commit(`test(tests-next): heal ${id}`, suitePaths)) {
    entry.status = 'healed';
    entry.reason = String(heal.answer?.reason ?? explanation);
    attempt.outcome = 'green';
  } else {
    resetTo(before, suitePaths);
    attempt.outcome = violations.length ? 'diff-refused' : String(heal.answer?.status ?? heal.stop);
    entry.reason = violations.length
      ? `Fix refused by the diff check: ${violations.join('; ')}`
      : `Could not heal: ${String(heal.answer?.reason ?? 'the spec is still red')}`;
    entry.link = await issue(
      id,
      `Could not heal: ${title}`,
      describe({
        spec,
        scenarioFile,
        verdict,
        failure: again.report,
        explanation: `${explanation}\n\n${entry.reason}`,
      })
    );
    failed = true;
  }
  save();
}

// The whole ui suite after fixes: a Page Object change reaches other files.
if (head() !== base) {
  const suite = await runSpecs({ specs: [], all: true });
  report.suite = { ran: true, ok: suite.code === 0, output: suite.report.slice(-4000) };
  if (suite.code !== 0) {
    report.notes.push('The whole ui suite fails after the fixes: the fixes were rolled back.');
    resetTo(base, suitePaths);
    for (const entry of report.entries) if (entry.status === 'healed') entry.status = 'failed';
    failed = true;
  }
}

save();
console.log(renderReport(report));
process.exit(failed ? 1 : 0);

/** Spec files (repo-relative) with an unexpected result in a Playwright JSON report. */
function failingFiles(/** @type {string} */ file) {
  if (!existsSync(file)) return [];
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const rootDir = json.config?.rootDir ?? path.join(REPO_ROOT, config.paths.suite, 'tests');
  /** @type {Set<string>} */
  const files = new Set();
  /** @param {any} suite */
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) {
      if (spec.tests?.some((/** @type {any} */ test) => test.status === 'unexpected')) {
        files.add(
          path.relative(REPO_ROOT, path.join(rootDir, spec.file)).split(path.sep).join('/')
        );
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of json.suites ?? []) visit(suite);
  return [...files].filter((spec) => spec.startsWith(`${config.paths.generated}/`));
}

function recentCommits() {
  try {
    return (
      git('log', '-n', '20', '--format=%h %ad %s', '--date=short', '--', 'packages/') || '(aucun)'
    );
  } catch {
    return '(historique indisponible)';
  }
}

/** @param {Record<string, unknown>} details */
function describe({ spec, scenarioFile, verdict, failure, explanation, expected, actual }) {
  return [
    `**Scenario:** \`${scenarioFile}\``,
    `**Spec:** \`${spec}\``,
    `**Triage verdict:** ${verdict}`,
    runUrl ? `**Run:** ${runUrl}` : '',
    '',
    explanation ? `### Analysis\n\n${explanation}` : '',
    expected ? `**Expected:** ${expected}` : '',
    actual ? `**Actual:** ${actual}` : '',
    '',
    '### Playwright output (end)',
    '',
    '```',
    String(failure).slice(-3000),
    '```',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/** Opens (or updates) the scenario's Linear issue. Without a key, the report says so. */
async function issue(
  /** @type {string} */ id,
  /** @type {string} */ title,
  /** @type {string} */ description
) {
  if (!process.env.NO_CODE_E2E_LINEAR_API_KEY) {
    report.notes.push(`No Linear key: no issue created for ${id}.`);
    return undefined;
  }
  try {
    const { url } = await reportIssue({ linear: config.linear, id, title, description });
    return url;
  } catch (error) {
    report.notes.push(`Ticket Linear impossible pour ${id} : ${error}`);
    return undefined;
  }
}
