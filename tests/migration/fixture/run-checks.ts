const { resolveCheckIds } = require('./registry');
const { CHECKS_BY_ID } = require('./checks');

type Strapi = import('@strapi/types').Core.Strapi;

type CheckContext = {
  strapi: Strapi;
  spec: unknown;
  activeEntries: Array<{ uid: string; checks?: string[] }>;
  flags: { skipJoinParity?: boolean };
  [key: string]: unknown;
};

type CheckResult = {
  errors?: string[];
  checks?: unknown[];
  lines?: string[];
};

async function runChecks(ctx: CheckContext) {
  const { spec, activeEntries, flags } = ctx;
  const checkIds = resolveCheckIds(spec, activeEntries, flags);
  const results: {
    errors: string[];
    checks: unknown[];
    sections: Array<{ name: string; errors: string[]; lines?: string[] }>;
    dbLines: string[];
  } = { errors: [], checks: [], sections: [], dbLines: [] };

  for (const checkId of checkIds) {
    const check = CHECKS_BY_ID[checkId];
    if (!check) {
      throw new Error(`Unknown check id "${checkId}"`);
    }

    if (checkId === 'joinTableParity' && flags.skipJoinParity) {
      console.log(
        '  (skipping DP join-table source parity — profile skipJoinParity or MIGRATION_SKIP_DP_JOIN_PARITY=1)'
      );
      results.sections.push({ name: check.title, errors: [] });
      continue;
    }

    const result: CheckResult = await check.run(ctx);
    const errors = result.errors || [];
    const lines = result.lines || [];

    results.errors.push(...errors);
    if (result.checks) {
      results.checks.push(...result.checks);
    }
    results.sections.push({ name: check.title, errors, lines });
    if (lines.length > 0) {
      results.dbLines.push(...lines);
    }
  }

  return results;
}

module.exports = { runChecks };
