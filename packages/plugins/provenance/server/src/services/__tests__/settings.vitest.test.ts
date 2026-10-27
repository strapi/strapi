import { describe, expect, it } from 'vitest';

import { createSettingsService, normalizeSettings } from '../settings';

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

describe('settings service', () => {
  const saved = {
    requireReviewBeforePublish: true,
    workflows: { 1: { approvalStageId: 3, reworkStageId: 1, aiReviewStageId: 2 } },
  };

  const createService = (features: string[]) =>
    createSettingsService({
      strapi: {
        store: () => ({ get: async () => saved, set: async () => undefined }),
        ee: { features: { isEnabled: (name: string) => features.includes(name) } },
      } as any,
    });

  it('applies the saved rules with the AI governance license feature', async () => {
    const service = createService(['cms-ai-governance']);

    expect(service.isGovernanceEnabled()).toBe(true);
    expect(await service.requiresReview()).toBe(true);
    expect(await service.getRules(1)).toEqual(saved.workflows[1]);
  });

  it('keeps the saved rules inactive without it', async () => {
    const service = createService(['review-workflows']);

    expect(service.isGovernanceEnabled()).toBe(false);
    expect(await service.requiresReview()).toBe(false);
    expect(await service.getRules(1)).toBeNull();
  });
});
