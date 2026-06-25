'use strict';

const spec = require('../spec');
const { getActiveEntriesForProfile } = require('../derive-expectations');
const { resolveCheckIds, resolveProfileConfig, PROFILES } = require('../registry');

describe('registry profiles', () => {
  test('full alias resolves to full-v4-origin config', () => {
    expect(resolveProfileConfig('full')).toEqual(resolveProfileConfig('full-v4-origin'));
  });

  test('full-ladder sets skipJoinParity', () => {
    expect(resolveProfileConfig('full-ladder').skipJoinParity).toBe(true);
  });

  test('all named profiles exist', () => {
    expect(Object.keys(PROFILES).sort()).toEqual([
      'full',
      'full-ladder',
      'full-v4-origin',
      'full-v5-origin',
    ]);
  });
});

describe('resolveCheckIds', () => {
  const v4Entries = getActiveEntriesForProfile(spec, 'v4');
  const v5Entries = getActiveEntriesForProfile(spec, 'v5');

  test('v4 profile includes relationApiParity for hc-m2m-source', () => {
    const ids = resolveCheckIds(spec, v4Entries, { skipJoinParity: false });
    expect(ids).toContain('relationApiParity');
    expect(ids).toContain('documentIdBackfill');
    expect(ids).toContain('joinTableParity');
  });

  test('v5 profile excludes hc-m2m checks via active entries', () => {
    const ids = resolveCheckIds(spec, v5Entries, { skipJoinParity: false });
    const hcEntry = v5Entries.find((e) => e.uid === 'api::hc-m2m-source.hc-m2m-source');
    expect(hcEntry).toBeUndefined();
    expect(ids).toContain('rowCounts');
    expect(ids).not.toContain(undefined);
  });

  test('full-ladder skipJoinParity drops joinTableParity', () => {
    const ids = resolveCheckIds(spec, v4Entries, { skipJoinParity: true });
    expect(ids).not.toContain('joinTableParity');
    expect(ids).toContain('relationApiParity');
  });

  test('checks run in documented order', () => {
    const ids = resolveCheckIds(spec, v4Entries, { skipJoinParity: false });
    const rowIdx = ids.indexOf('rowCounts');
    const docIdx = ids.indexOf('documentIdBackfill');
    const dbIdx = ids.indexOf('dbMorphAndDz');
    expect(rowIdx).toBeLessThan(docIdx);
    expect(docIdx).toBeLessThan(dbIdx);
  });
});
