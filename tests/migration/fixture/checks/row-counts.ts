const { countFor, countPublishedDrafts, parseCountResult } = require('../db-helpers');

type Strapi = import('@strapi/types').Core.Strapi;

type SimpleExpectation = { kind: 'simple'; label: string; totalRows: number };
type DraftPublishExpectation = {
  kind: 'draftPublish';
  label: string;
  published: number;
  draftRows: number;
  totalRows: number;
};
type MediaExpectation = { kind: 'media'; label: string; minRows: number };
type Expectation = SimpleExpectation | DraftPublishExpectation | MediaExpectation;

type ActiveEntry = { uid: string; label: string; checks?: string[] };

const SECTION_TITLE = 'Counts';

async function runRowCounts(
  strapi: Strapi,
  expectations: Map<string, Expectation>,
  activeEntries: ActiveEntry[]
) {
  const errors: string[] = [];
  const checks: Array<{ type: string; actual: number; expected: number }> = [];

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
  if (mediaExpect && mediaExpect.kind === 'media') {
    const mediaCountRes = await strapi.db.query('plugin::upload.file').count();
    const mediaCount = parseCountResult(mediaCountRes[0] || mediaCountRes);
    checks.push({ type: 'media', actual: mediaCount, expected: mediaExpect.minRows });
    if (mediaCount < mediaExpect.minRows) {
      errors.push(`media: expected >= ${mediaExpect.minRows}, got ${mediaCount}`);
    }
  }

  return { errors, checks, lines: [] as string[] };
}

module.exports = {
  id: 'rowCounts',
  title: SECTION_TITLE,
  async run({
    strapi,
    expectations,
    activeEntries,
  }: {
    strapi: Strapi;
    expectations: Map<string, Expectation>;
    activeEntries: ActiveEntry[];
  }) {
    return runRowCounts(strapi, expectations, activeEntries);
  },
};
