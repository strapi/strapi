// @ts-check
/**
 * Renders a run report (JSON written by generate.mjs or heal.mjs) as Markdown, for the job
 * summary and the PR comment.
 *
 *   node report.mjs <report.json>                       # prints the Markdown
 *   node report.mjs <report.json> --comment <pr-number> # creates or updates the PR comment (gh)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

/** One comment per mode: a heal run doesn't overwrite the generation report. */
const marker = (/** @type {string} */ mode) => `<!-- no-code-e2e-report:${mode} -->`;

const STATUS = {
  generated: '✅ généré',
  healed: '🩹 corrigé',
  refused: '⛔ refusé',
  needs_clarification: '❓ à préciser',
  failed: '❌ échec',
  deleted: '🗑️ spec supprimée',
  skipped: '⏭️ ignoré',
  regression: '🐞 régression potentielle',
  flaky: '🎲 flaky',
  environment: '⚙️ problème d’environnement',
};

/**
 * @typedef {object} Attempt
 * @property {string} task generate, escalate, triage, heal
 * @property {string} model
 * @property {number} costUsd
 * @property {number} turns
 * @property {string} outcome
 *
 * @typedef {object} Entry
 * @property {string} id
 * @property {string} file
 * @property {string} [spec]
 * @property {keyof typeof STATUS} status
 * @property {string} [reason]
 * @property {string} [link] A Linear issue, for instance.
 * @property {Attempt[]} attempts
 *
 * @typedef {object} Report
 * @property {'generate' | 'heal'} mode
 * @property {string} base
 * @property {Entry[]} entries
 * @property {Array<{ file: string, errors: string[], warnings: string[] }>} lint
 * @property {{ ran: boolean, ok: boolean, output?: string }} suite Run of the whole ui suite.
 * @property {{ ok: boolean, violations: string[] }} diffCheck
 * @property {string[]} notes
 */

const money = (/** @type {number} */ value) => `$${value.toFixed(2)}`;

export const totalCost = (/** @type {Report} */ report) =>
  report.entries
    .flatMap((entry) => entry.attempts)
    .reduce((sum, attempt) => sum + attempt.costUsd, 0);

/** @param {Report} report */
export const renderReport = (report) => {
  const lines = [
    marker(report.mode),
    `## No-code E2E : ${report.mode === 'generate' ? 'génération' : 'heal'}`,
    '',
  ];

  const lintErrors = report.lint.filter((item) => item.errors.length);
  const lintWarnings = report.lint.filter((item) => item.warnings.length);
  if (lintErrors.length) {
    lines.push('### ❌ Scénarios invalides', '');
    for (const item of lintErrors) {
      lines.push(`- \`${item.file}\``, ...item.errors.map((error) => `  - ${error}`));
    }
    lines.push('');
  }

  if (report.entries.length) {
    lines.push(
      '| Scénario | Résultat | Détail | Modèles | Coût |',
      '| --- | --- | --- | --- | --- |'
    );
    for (const entry of report.entries) {
      const models = entry.attempts
        .map((attempt) => `${attempt.task}:${attempt.model} (${attempt.turns} tours)`)
        .join(', ');
      const cost = entry.attempts.reduce((sum, attempt) => sum + attempt.costUsd, 0);
      const detail = [entry.reason, entry.link]
        .filter(Boolean)
        .join(' · ')
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ');
      lines.push(
        `| \`${entry.id}\` | ${STATUS[entry.status] ?? entry.status} | ${detail} | ${models || '—'} | ${money(cost)} |`
      );
    }
    lines.push('', `**Coût total : ${money(totalCost(report))}**`, '');
  } else if (!lintErrors.length) {
    lines.push('Rien à faire : toutes les specs sont à jour.', '');
  }

  if (report.suite.ran) {
    lines.push(
      report.suite.ok
        ? '✅ Suite ui complète : verte.'
        : '❌ Suite ui complète : en échec, voir le job.',
      ''
    );
  }
  if (!report.diffCheck.ok) {
    lines.push('### ❌ Contrôle du diff', '', 'Les changements de l’agent ont été annulés :', '');
    lines.push(...report.diffCheck.violations.map((violation) => `- ${violation}`), '');
  }
  if (lintWarnings.length) {
    lines.push('<details><summary>Avertissements du lint</summary>', '');
    for (const item of lintWarnings) lines.push(`- \`${item.file}\` : ${item.warnings.join(' ')}`);
    lines.push('', '</details>', '');
  }
  if (report.notes.length) lines.push(...report.notes.map((note) => `> ${note}`), '');
  return lines.join('\n');
};

/** Creates the PR comment, or updates the previous one (found by its marker). */
const upsertComment = (
  /** @type {string} */ pr,
  /** @type {string} */ body,
  /** @type {string} */ mode
) => {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('GITHUB_REPOSITORY is not set');
  const comments = JSON.parse(
    execFileSync('gh', ['api', `repos/${repo}/issues/${pr}/comments`, '--paginate', '--slurp'], {
      encoding: 'utf8',
    })
  ).flat();
  const previous = comments.find((/** @type {{ body?: string }} */ comment) =>
    comment.body?.includes(marker(mode))
  );
  const file = path.join(tmpdir(), 'no-code-e2e-comment.json');
  writeFileSync(file, JSON.stringify({ body }));
  const endpoint = previous
    ? [`repos/${repo}/issues/comments/${previous.id}`, '--method', 'PATCH']
    : [`repos/${repo}/issues/${pr}/comments`, '--method', 'POST'];
  execFileSync('gh', ['api', ...endpoint, '--input', file], { stdio: 'inherit' });
};

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { comment: { type: 'string' } },
  });
  const report = /** @type {Report} */ (JSON.parse(readFileSync(positionals[0], 'utf8')));
  const markdown = renderReport(report);
  if (values.comment) upsertComment(values.comment, markdown, report.mode);
  else console.log(markdown);
}
