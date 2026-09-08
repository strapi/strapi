import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  appendSummary,
  createActionsEnv,
  getBooleanInput,
  getInput,
  info,
  repositoryCoords,
  setFailed,
  setOutput,
  warning,
} from './lib/actions.ts';
import { createGithubAdapter } from './lib/github.ts';
import { createGitAdapter, createGitExec } from './lib/range.ts';
import { createJournal } from './lib/journal.ts';
import { renderJournalTable } from './lib/report.ts';
import { runDraftRelease } from './lib/pipeline.ts';

import type { ActionsEnv } from './lib/actions.ts';

const JOURNAL_FILENAME = 'draft-release-journal.json';

/**
 * The journal is always written to disk, so a run that dies halfway still says what it did. The
 * workflow uploads it with `if: always()`.
 */
function resolveJournalPath(env: ActionsEnv): string {
  const directory = env.read('RUNNER_TEMP') ?? env.read('GITHUB_WORKSPACE') ?? process.cwd();

  return join(directory, JOURNAL_FILENAME);
}

function writeJournal(target: string, payload: unknown): void {
  writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Publishes the step summary without letting it mask the run's own outcome.
 *
 * A missing summary file must never turn a precise error into a reporting failure.
 */
function publishSummary(env: ActionsEnv, markdown: string): void {
  if (appendSummary(env, markdown) === false) {
    warning(env, 'No step summary file is available, so the report was not published.');
  }
}

async function main(env: ActionsEnv): Promise<void> {
  const journalPath = resolveJournalPath(env);
  const journal = createJournal({ apply: getBooleanInput(env, 'dry_run') === false });

  setOutput(env, 'journal_path', journalPath);

  try {
    const result = await runDraftRelease({
      inputs: {
        version: getInput(env, 'version'),
        dryRun: getBooleanInput(env, 'dry_run'),
      },
      git: createGitAdapter(createGitExec()),
      gh: createGithubAdapter(
        getInput(env, 'token', { required: true }),
        repositoryCoords(env),
        (url, init) => fetch(url, init)
      ),
      journal,
      request: (url) => fetch(url, { headers: { accept: 'application/json' } }),
      logger: { info: (message) => info(env, message) },
    });

    writeJournal(journalPath, { status: 'succeeded', ...result.journal });

    setOutput(env, 'version', result.version);
    setOutput(env, 'bump', result.bump);
    setOutput(env, 'mode', result.mode);
    setOutput(env, 'branch', result.branch);
    setOutput(env, 'pr_number', result.pullNumber === null ? '' : String(result.pullNumber));
    setOutput(env, 'pr_url', result.pullUrl ?? '');

    result.warnings.forEach((entry) => warning(env, entry));

    publishSummary(env, result.summary);
  } catch (error) {
    // The action never rolls back. Persisting what was already written is what makes finishing by
    // hand mechanical, so the journal is flushed before the failure surfaces.
    const message = describe(error);

    writeJournal(journalPath, { status: 'failed', error: message, ...journal.toJSON() });

    publishSummary(
      env,
      [
        '# draft-release failed',
        '',
        message,
        '',
        '## Writes performed before the failure',
        '',
        renderJournalTable(journal.entries()),
      ].join('\n')
    );

    setFailed(env, message);
  }
}

await main(createActionsEnv());
