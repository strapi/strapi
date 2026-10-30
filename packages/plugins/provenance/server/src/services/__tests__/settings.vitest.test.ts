import { describe, expect, it } from 'vitest';

import { createSettingsService, normalizeSettings } from '../settings';

describe('normalizeSettings', () => {
  it('defaults to no publish guard', () => {
    expect(normalizeSettings(undefined)).toEqual({ requireReviewBeforePublish: false });
  });

  it('drops anything else, including rules saved by earlier versions', () => {
    expect(
      normalizeSettings({
        requireReviewBeforePublish: true,
        extra: 'dropped',
        workflows: { 1: { approvalStageId: 4 } },
      })
    ).toEqual({ requireReviewBeforePublish: true });
  });

  it('only enables the publish guard with a real boolean', () => {
    expect(
      normalizeSettings({ requireReviewBeforePublish: 'true' }).requireReviewBeforePublish
    ).toBe(false);
  });
});

describe('settings service', () => {
  const createService = (features: string[]) =>
    createSettingsService({
      strapi: {
        store: () => ({
          get: async () => ({ requireReviewBeforePublish: true }),
          set: async () => undefined,
        }),
        ee: { features: { isEnabled: (name: string) => features.includes(name) } },
      } as any,
    });

  it('applies the saved guard with the license feature', async () => {
    const service = createService(['cms-ai-governance']);

    expect(service.isProvenanceEnabled()).toBe(true);
    expect(await service.requiresReview()).toBe(true);
  });

  it('is off without it', async () => {
    const service = createService(['review-workflows']);

    expect(service.isProvenanceEnabled()).toBe(false);
    expect(await service.requiresReview()).toBe(false);
  });
});
