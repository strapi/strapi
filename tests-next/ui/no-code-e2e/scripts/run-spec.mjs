// @ts-check
/**
 * Runs ui specs with the suite's config and prints a short report: the end of the Playwright
 * output and, for each failure, the page snapshot Playwright saves (`error-context.md`). The
 * agents call it instead of `playwright test`, so they read a few hundred lines, not thousands.
 *
 *   node tests-next/ui/no-code-e2e/scripts/run-spec.mjs <spec...> [--repeat-each N] [--retries N]
 *   node tests-next/ui/no-code-e2e/scripts/run-spec.mjs --all
 *
 * Paths are repo-relative (`tests-next/ui/tests/...`) or relative to tests-next/ui (`tests/...`).
 * Exit code: Playwright's.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { loadConfig, REPO_ROOT } from './lib.mjs';

const MAX_OUTPUT_LINES = 150;
const MAX_CONTEXT_LINES = 120;
const MAX_CONTEXTS = 3;

// eslint-disable-next-line no-control-regex
const stripAnsi = (/** @type {string} */ text) => text.replace(/\u001b\[[0-9;]*m/g, '');

/**
 * @param {object} options
 * @param {string[]} options.specs Empty with `all`.
 * @param {boolean} [options.all]
 * @param {number} [options.repeatEach]
 * @param {number} [options.retries]
 * @param {string} [options.jsonOutput] Absolute path of a JSON report to write.
 * @param {boolean} [options.quiet] Don't stream the output.
 * @returns {Promise<{ code: number, report: string }>}
 */
export const runSpecs = async ({ specs, all, repeatEach, retries, jsonOutput, quiet = true }) => {
  const config = loadConfig();
  const suiteDir = path.join(REPO_ROOT, config.paths.suite);
  const suitePrefix = `${config.paths.suite}/`;
  const files = all
    ? []
    : specs.map((spec) => (spec.startsWith(suitePrefix) ? spec.slice(suitePrefix.length) : spec));

  const args = [
    'test',
    ...files,
    `--project=${config.project}`,
    `--reporter=${jsonOutput ? 'line,json' : 'line'}`,
  ];
  if (repeatEach) args.push(`--repeat-each=${repeatEach}`);
  if (retries !== undefined) args.push(`--retries=${retries}`);

  const output = await new Promise((resolve) => {
    let text = '';
    const child = spawn('yarn', args, {
      cwd: suiteDir,
      env: { ...process.env, ...(jsonOutput ? { PLAYWRIGHT_JSON_OUTPUT_NAME: jsonOutput } : {}) },
    });
    const collect = (/** @type {Buffer} */ chunk) => {
      text += chunk.toString();
      if (!quiet) process.stdout.write(chunk);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('close', (code) => resolve({ code: code ?? 1, text: stripAnsi(text) }));
  });

  const lines = output.text.split('\n');
  const parts = [];
  if (lines.length > MAX_OUTPUT_LINES)
    parts.push(`[… ${lines.length - MAX_OUTPUT_LINES} lignes coupées …]`);
  parts.push(lines.slice(-MAX_OUTPUT_LINES).join('\n'));

  if (output.code !== 0) {
    const contexts = findErrorContexts(path.join(suiteDir, 'test-results')).slice(0, MAX_CONTEXTS);
    for (const file of contexts) {
      const content = readFileSync(file, 'utf8').split('\n');
      parts.push(
        `\n===== ${path.relative(REPO_ROOT, file)} (snapshot de la page au moment de l'échec) =====`,
        content.slice(0, MAX_CONTEXT_LINES).join('\n'),
        content.length > MAX_CONTEXT_LINES
          ? `[… ${content.length - MAX_CONTEXT_LINES} lignes coupées …]`
          : ''
      );
    }
  }

  return { code: output.code, report: parts.join('\n') };
};

/** Playwright empties `test-results` when a run starts: what's there is this run's. */
const findErrorContexts = (/** @type {string} */ dir) => {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const found = [];
  const visit = (/** @type {string} */ current) => {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      if (statSync(full).isDirectory()) visit(full);
      else if (name === 'error-context.md') found.push(full);
    }
  };
  visit(dir);
  return found;
};

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      all: { type: 'boolean', default: false },
      'repeat-each': { type: 'string' },
      retries: { type: 'string' },
    },
  });
  if (!values.all && positionals.length === 0) {
    console.error('Usage: run-spec.mjs <spec...> [--repeat-each N] [--retries N] | --all');
    process.exit(2);
  }
  const { code, report } = await runSpecs({
    specs: positionals,
    all: values.all,
    repeatEach: values['repeat-each'] ? Number(values['repeat-each']) : undefined,
    retries: values.retries ? Number(values.retries) : undefined,
  });
  console.log(report);
  process.exit(code);
}
