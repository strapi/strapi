'use strict';

const { resolveCheckIds } = require('./registry');
const { CHECKS_BY_ID } = require('./checks');

/**
 * @param {object} ctx
 * @param {import('@strapi/strapi').Core.Strapi} ctx.strapi
 */
async function runChecks(ctx) {
  const { strapi, spec, activeEntries, flags } = ctx;
  const checkIds = resolveCheckIds(spec, activeEntries, flags);
  const results = { errors: [], checks: [], sections: [], dbLines: [] };

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

    const result = await check.run(ctx);
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
