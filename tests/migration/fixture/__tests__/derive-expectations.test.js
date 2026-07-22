'use strict';

const spec = require('../spec');
const {
  deriveDraftPublishRows,
  deriveExpectationsForProfile,
  getSeedCountsForProfile,
  getActiveEntriesForProfile,
} = require('../derive-expectations');

describe('deriveDraftPublishRows', () => {
  test('non-i18n DP at m=1 matches legacy basic-dp math', () => {
    expect(deriveDraftPublishRows({ published: 3, draftOnly: 2 }, 1)).toEqual({
      published: 3,
      draftRows: 5,
      totalRows: 8,
    });
  });

  test('i18n perLocale 3/2 with 2 locales at m=1', () => {
    expect(deriveDraftPublishRows({ published: 3, draftOnly: 2 }, 1, { localeCount: 2 })).toEqual({
      published: 6,
      draftRows: 10,
      totalRows: 16,
    });
  });

  test('multiplier scales published and draft-only rows', () => {
    expect(deriveDraftPublishRows({ published: 3, draftOnly: 2 }, 2)).toEqual({
      published: 6,
      draftRows: 10,
      totalRows: 16,
    });
  });
});

describe('deriveExpectationsForProfile', () => {
  test('v4 profile includes hc-m2m content types', () => {
    const expectations = deriveExpectationsForProfile(spec, { profile: 'v4', multiplier: 1 });
    expect(expectations.has('api::hc-m2m-source.hc-m2m-source')).toBe(true);
    expect(expectations.has('api::hc-m2m-target.hc-m2m-target')).toBe(true);
  });

  test('v5 profile excludes hc-m2m content types', () => {
    const expectations = deriveExpectationsForProfile(spec, { profile: 'v5', multiplier: 1 });
    expect(expectations.has('api::hc-m2m-source.hc-m2m-source')).toBe(false);
    expect(expectations.has('api::hc-m2m-target.hc-m2m-target')).toBe(false);
  });

  test('basic-dp-i18n expectations at m=1', () => {
    const expectations = deriveExpectationsForProfile(spec, { profile: 'v4', multiplier: 1 });
    const basicDpI18n = expectations.get('api::basic-dp-i18n.basic-dp-i18n');
    expect(basicDpI18n).toEqual({
      kind: 'draftPublish',
      label: 'basic-dp-i18n',
      published: 6,
      draftRows: 10,
      totalRows: 16,
    });
  });
});

describe('getSeedCountsForProfile', () => {
  test('v4 profile includes hc-m2m seed counts', () => {
    const counts = getSeedCountsForProfile(spec, { profile: 'v4', multiplier: 1 });
    expect(counts.hcM2mSource).toEqual({ published: 15, drafts: 5 });
    expect(counts.hcM2mTargetsPerSource).toBe(10);
  });

  test('v5 profile omits hc-m2m seed counts', () => {
    const counts = getSeedCountsForProfile(spec, { profile: 'v5', multiplier: 1 });
    expect(counts.hcM2mSource).toBeUndefined();
    expect(counts.hcM2mTarget).toBeUndefined();
    expect(counts.basic).toBe(5);
  });

  test('multiplier applies to mediaFiles', () => {
    const counts = getSeedCountsForProfile(spec, { profile: 'v5', multiplier: 2 });
    expect(counts.mediaFiles).toBe(20);
  });
});

describe('getActiveEntriesForProfile', () => {
  test('v5 active entries exclude hc-m2m', () => {
    const entries = getActiveEntriesForProfile(spec, 'v5');
    const uids = entries.map((e) => e.uid);
    expect(uids).not.toContain('api::hc-m2m-source.hc-m2m-source');
    expect(uids).toContain('api::basic.basic');
  });
});
