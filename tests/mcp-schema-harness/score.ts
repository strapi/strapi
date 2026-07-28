/**
 * Turns raw harness output into the numbers you can actually quote.
 *
 *   npx tsx tests/mcp-schema-harness/score.ts runs.json
 *   npx tsx tests/mcp-schema-harness/score.ts runs.json --md
 *
 * `runs.json` is the `results` array the workflow returns: objects of
 * `{ variant, scenario, rep, reply, judgment? }`. Every metric printed here is recomputed
 * from the raw `reply` text via ajv and the Document Service model — the workflow's own
 * judgments are carried through for context but never counted.
 *
 * This split is the point: round 1's percentages were tallied from model-set booleans that
 * contradicted their own notes, and had to be retracted. Anything numeric comes from here.
 */
import { readFileSync } from 'node:fs';

import { SCENARIOS_BY_KEY } from './scenarios';
import { buildVariants, type JsonSchema } from './variants';
import { gradeMechanically, type MechanicalGrade } from './validate';

type RawRun = {
  variant: string;
  scenario: string;
  rep: number;
  reply: string;
  judgment?: Record<string, unknown>;
};

type ScoredRun = RawRun & { grade: MechanicalGrade };

const file = process.argv[2];
const asMarkdown = process.argv.includes('--md');

if (file === undefined) {
  // eslint-disable-next-line no-console
  console.error('usage: tsx score.ts <runs.json> [--md]');
  process.exit(1);
}

const raw = JSON.parse(readFileSync(file, 'utf8')) as RawRun[] | { results: RawRun[] };
const runs: RawRun[] = Array.isArray(raw) ? raw : raw.results;

const variants = buildVariants() as Record<string, JsonSchema>;

const scored: ScoredRun[] = runs.map((run) => {
  const schema = variants[run.variant];
  const scenario = SCENARIOS_BY_KEY[run.scenario];
  if (schema === undefined) throw new Error(`Unknown variant "${run.variant}"`);
  if (scenario === undefined) throw new Error(`Unknown scenario "${run.scenario}"`);
  return { ...run, grade: gradeMechanically(run.reply ?? '', schema, scenario) };
});

const pct = (n: number, d: number): string =>
  d === 0 ? 'n/a' : `${Math.round((n / d) * 100)}% (${n}/${d})`;

const variantKeys = [...new Set(scored.map((r) => r.variant))];
const scenarioKeys = [...new Set(scored.map((r) => r.scenario))].sort();

type Agg = {
  total: number;
  /** Replies that were payloads rather than clarifying questions. */
  payloadTotal: number;
  schemaValid: number;
  collateralLoss: number;
  droppedSibling: number;
  lostSeoField: number;
  invalidRow: number;
  inventedId: number;
  clarification: number;
  unparseable: number;
};

function aggregate(rows: ScoredRun[]): Agg {
  // Schema validity is rated over payload replies only: a clarifying question has no payload to
  // validate, and scoring it "invalid" would understate a variant that correctly induced a question.
  const payloadRows = rows.filter((r) => r.grade.looksLikeClarification === false);
  return {
    total: rows.length,
    payloadTotal: payloadRows.length,
    schemaValid: payloadRows.filter((r) => r.grade.schemaValid).length,
    collateralLoss: rows.filter((r) => r.grade.collateralLoss).length,
    droppedSibling: rows.filter((r) => r.grade.droppedSiblingItem).length,
    lostSeoField: rows.filter((r) => r.grade.lostSeoFields.length > 0).length,
    invalidRow: rows.filter((r) => r.grade.wroteInvalidRow).length,
    inventedId: rows.filter((r) => r.grade.inventedId).length,
    clarification: rows.filter((r) => r.grade.looksLikeClarification).length,
    unparseable: rows.filter((r) => r.grade.parsed === false && !r.grade.looksLikeClarification)
      .length,
  };
}

const lines: string[] = [];
const out = (s = ''): void => {
  lines.push(s);
};

out('# MCP component-schema harness — mechanical results');
out();
out(`Runs scored: ${scored.length}`);
out();
out('All figures below are computed by ajv + the Document Service model in `validate.ts`.');
out('No model judgment contributes to any number on this page.');
out();

out('## Aggregate by variant');
out();
out(
  '| variant | runs | schema-valid | collateral loss | dropped sibling row | lost seo field | wrote invalid row | invented id | asked clarification |'
);
out('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const v of variantKeys) {
  const a = aggregate(scored.filter((r) => r.variant === v));
  out(
    `| ${v} | ${a.total} | ${pct(a.schemaValid, a.payloadTotal)} | ${pct(a.collateralLoss, a.total)} | ` +
      `${pct(a.droppedSibling, a.total)} | ${pct(a.lostSeoField, a.total)} | ${pct(a.invalidRow, a.total)} | ` +
      `${pct(a.inventedId, a.total)} | ${pct(a.clarification, a.total)} |`
  );
}
out();

out('## Per scenario');
out();
out(`| scenario | ${variantKeys.map((v) => `${v}: loss / valid`).join(' | ')} |`);
out(`| --- | ${variantKeys.map(() => '---').join(' | ')} |`);
for (const s of scenarioKeys) {
  const cells = variantKeys.map((v) => {
    const rows = scored.filter((r) => r.variant === v && r.scenario === s);
    const a = aggregate(rows);
    return `${a.collateralLoss}/${a.total} loss · ${a.schemaValid}/${a.payloadTotal} valid`;
  });
  out(`| ${s} | ${cells.join(' | ')} |`);
}
out();

out('## Failures in detail');
out();
// A clarifying question is a legitimate outcome on an underspecified task (S4 documents this),
// so it is reported separately rather than counted as a malformed payload.
const failures = scored.filter(
  (r) =>
    r.grade.looksLikeClarification === false &&
    (r.grade.collateralLoss || r.grade.schemaValid === false || r.grade.inventedId)
);
if (failures.length === 0) {
  out('None — every payload was schema-valid and lossless.');
} else {
  for (const f of failures) {
    const reasons: string[] = [];
    if (f.grade.schemaValid === false) {
      reasons.push(
        f.grade.parsed
          ? `schema-invalid (${f.grade.schemaErrors.slice(0, 2).join('; ')})`
          : `unparseable: ${f.grade.parseError}`
      );
    }
    if (f.grade.droppedLinkIds.length > 0) {
      reasons.push(`deleted link id(s) ${f.grade.droppedLinkIds.join(', ')}`);
    }
    if (f.grade.lostSeoFields.length > 0) {
      reasons.push(`lost seo field(s) ${f.grade.lostSeoFields.join(', ')}`);
    }
    if (f.grade.wroteInvalidRow)
      reasons.push(`invalid row: ${f.grade.invalidRowDetail.join('; ')}`);
    if (f.grade.inventedId) reasons.push('invented an id');
    out(`- **${f.variant}/${f.scenario}#${f.rep}** — ${reasons.join(' · ')}`);
    out(`  \`${(f.reply ?? '').replace(/\s+/g, ' ').slice(0, 200)}\``);
  }
}
out();

const clarifications = scored.filter((r) => r.grade.looksLikeClarification);
if (clarifications.length > 0) {
  out('## Clarifying questions (not failures)');
  out();
  out('Asking rather than guessing is the correct move on an underspecified schema.');
  out();
  for (const c of clarifications) {
    out(
      `- **${c.variant}/${c.scenario}#${c.rep}** — \`${(c.reply ?? '').replace(/\s+/g, ' ').slice(0, 160)}\``
    );
  }
  out();
}

out('## Judgment vs mechanics');
out();
out('Runs where the model said the payload achieves intent but the mechanics found data loss —');
out('these are exactly the cases a model-only rubric scores as successes.');
out();
const disagreements = scored.filter(
  (r) => r.judgment?.achieves_intent === true && r.grade.collateralLoss
);
if (disagreements.length === 0) {
  out('None.');
} else {
  for (const d of disagreements) {
    out(
      `- ${d.variant}/${d.scenario}#${d.rep}: intent satisfied, but ${
        d.grade.droppedLinkIds.length > 0
          ? `link ${d.grade.droppedLinkIds.join(',')} deleted`
          : d.grade.lostSeoFields.length > 0
            ? `seo ${d.grade.lostSeoFields.join(',')} lost`
            : d.grade.invalidRowDetail.join('; ')
      }`
    );
  }
}

const report = lines.join('\n');

if (asMarkdown) {
  // eslint-disable-next-line no-console
  console.log(report);
} else {
  // eslint-disable-next-line no-console
  console.log(report);
  // eslint-disable-next-line no-console
  console.error(`\n(scored ${scored.length} runs from ${file})`);
}
