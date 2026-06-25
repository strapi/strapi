'use strict';

const { countFor, countPublishedDrafts, parseCountResult } = require('../db-helpers');

const SECTION_TITLE = 'Counts';

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 * @param {Map<string, object>} expectations
 * @param {Array<{ uid: string, label: string, checks?: string[] }>} activeEntries
 */
async function runRowCounts(strapi, expectations, activeEntries) {
  const errors = [];
  const checks = [];

  for (const entry of activeEntries) {
    if (!entry.checks?.includes('rowCounts')) {
      continue;
    }

    const expect = expectations.get(entry.uid);
    if (!expect) {
      continue;
    }

    if (expect.kind === 'simple') {
      const actual = await countFor(strapi, entry.uid);
      checks.push({ type: entry.label, actual, expected: expect.totalRows });
      if (actual !== expect.totalRows) {
        errors.push(`${entry.label}: expected ${expect.totalRows}, got ${actual}`);
      }
    } else if (expect.kind === 'draftPublish') {
      const counts = await countPublishedDrafts(strapi, entry.uid);
      const actualTotal = counts.published + counts.drafts;
      checks.push({
        type: `${entry.label} (published)`,
        actual: counts.published,
        expected: expect.published,
      });
      checks.push({
        type: `${entry.label} (drafts)`,
        actual: counts.drafts,
        expected: expect.draftRows,
      });
      checks.push({
        type: `${entry.label} (total)`,
        actual: actualTotal,
        expected: expect.totalRows,
      });
      if (counts.published !== expect.published) {
        errors.push(
          `${entry.label} published: expected ${expect.published}, got ${counts.published}`
        );
      }
      if (counts.drafts !== expect.draftRows) {
        errors.push(`${entry.label} drafts: expected ${expect.draftRows}, got ${counts.drafts}`);
      }
    }
  }

  const mediaExpect = expectations.get('__media__');
  if (mediaExpect) {
    const mediaCountRes = await strapi.db.query('plugin::upload.file').count();
    const mediaCount = parseCountResult(mediaCountRes[0] || mediaCountRes);
    checks.push({ type: 'media', actual: mediaCount, expected: mediaExpect.minRows });
    if (mediaCount < mediaExpect.minRows) {
      errors.push(`media: expected >= ${mediaExpect.minRows}, got ${mediaCount}`);
    }
  }

  return { errors, checks, lines: [] };
}

module.exports = {
  id: 'rowCounts',
  title: SECTION_TITLE,
  async run({ strapi, expectations, activeEntries }) {
    return runRowCounts(strapi, expectations, activeEntries);
  },
};
