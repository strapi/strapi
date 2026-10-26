import { describe, expect, it } from 'vitest';

import { normalizeSettings } from '../settings';

describe('normalizeSettings', () => {
  it('defaults to no rules', () => {
    expect(normalizeSettings(undefined)).toEqual({
      requireReviewBeforePublish: false,
      workflows: {},
    });
  });

  it('keeps valid stage ids and drops anything else', () => {
    expect(
      normalizeSettings({
        requireReviewBeforePublish: true,
        extra: 'dropped',
        workflows: {
          1: { approvalStageId: '4', reworkStageId: null, aiReviewStageId: 'abc', other: 3 },
        },
      })
    ).toEqual({
      requireReviewBeforePublish: true,
      workflows: { 1: { approvalStageId: 4, reworkStageId: null, aiReviewStageId: null } },
    });
  });

  it('only enables the publish guard with a real boolean', () => {
    expect(
      normalizeSettings({ requireReviewBeforePublish: 'true' }).requireReviewBeforePublish
    ).toBe(false);
  });
});
