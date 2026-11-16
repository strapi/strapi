import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';
import createValidationService from '../validation';
import {
  ERRORS,
  DEFAULT_NUMBER_OF_WORKFLOWS,
  DEFAULT_STAGES_PER_WORKFLOW,
} from '../../constants/workflows';

/**
 * Creates the real validation service against a mutable license feature. The workflow and stage
 * counts are the only stubbed data sources.
 */
const createWith = (initialFeature: unknown, { workflows = 0, stages = 0 } = {}) => {
  const license = { feature: initialFeature };
  const services: Record<string, unknown> = {
    workflows: { count: vi.fn().mockResolvedValue(workflows) },
    stages: { count: vi.fn().mockResolvedValue(stages) },
  };

  const strapi = {
    plugin: () => ({ service: (name: string) => services[name] }),
    ee: {
      features: {
        get: (name: string) => (name === 'review-workflows' ? license.feature : undefined),
      },
    },
  } as any;

  return { validation: createValidationService({ strapi }), license };
};

// The license stores the review workflows limits under `options`, as the entitlements code
// and the admin `useLicenseLimits` hook read them.
const featureWith = (options: Record<string, unknown>) => ({ name: 'review-workflows', options });

describe('review-workflows validation service', () => {
  it('reads the license limits', () => {
    const { validation } = createWith(featureWith({ numberOfWorkflows: 2, stagesPerWorkflow: 3 }));

    expect(validation.getLimits()).toEqual({ numberOfWorkflows: 2, stagesPerWorkflow: 3 });
  });

  it('rejects a workflow above the license workflow limit', async () => {
    const { validation } = createWith(featureWith({ numberOfWorkflows: 2 }), { workflows: 2 });

    await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
  });

  it('rejects stages above the license stage limit', () => {
    const { validation } = createWith(featureWith({ stagesPerWorkflow: 3 }));

    expect(() =>
      validation.validateWorkflowStages([
        { name: 'a' },
        { name: 'b' },
        { name: 'c' },
        { name: 'd' },
      ])
    ).toThrow(ERRORS.STAGES_LIMIT);
  });

  it('applies a license upgrade received after the service was created', async () => {
    const { validation, license } = createWith(featureWith({ numberOfWorkflows: 2 }), {
      workflows: 2,
    });
    await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);

    // The registry license replaces the boot license (`ee.update`)
    license.feature = featureWith({ numberOfWorkflows: 3 });

    await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();
  });

  it('applies a license downgrade received after the service was created', async () => {
    const { validation, license } = createWith(featureWith({ numberOfWorkflows: 3 }), {
      workflows: 2,
    });
    await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();

    license.feature = featureWith({ numberOfWorkflows: 2 });

    await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
  });

  it('keeps the default limits when the license does not list the feature', () => {
    const { validation } = createWith(undefined);

    expect(validation.getLimits()).toEqual({ numberOfWorkflows: 200, stagesPerWorkflow: 200 });
  });

  it.each([['not-a-number'], [0], [Number.NaN]])(
    'keeps the default limits when the license limits are %s',
    (value) => {
      const { validation } = createWith(
        featureWith({ numberOfWorkflows: value, stagesPerWorkflow: value })
      );

      expect(validation.getLimits()).toEqual({ numberOfWorkflows: 200, stagesPerWorkflow: 200 });
    }
  );

  it('uses a license limit above the default and defaults a negative one', () => {
    const { validation } = createWith(
      featureWith({ numberOfWorkflows: 500, stagesPerWorkflow: -1 })
    );

    expect(validation.getLimits()).toEqual({ numberOfWorkflows: 500, stagesPerWorkflow: 200 });
  });
});

type Feature = { name: string; options?: Record<string, unknown> } | undefined;

const reviewWorkflowsFeature = (options?: Record<string, unknown>): Feature => ({
  name: 'review-workflows',
  ...(options && { options }),
});

const createStrapiMock = (initialFeature: Feature) => {
  let feature = initialFeature;
  const countWorkflows = vi.fn();

  const services: Record<string, unknown> = {
    workflows: { count: countWorkflows },
  };

  const strapi = {
    ee: { features: { get: vi.fn(() => feature) } },
    plugin: vi.fn(() => ({ service: vi.fn((name: string) => services[name]) })),
  } as unknown as Core.Strapi;

  return {
    strapi,
    countWorkflows,
    setFeature(next: Feature) {
      feature = next;
    },
  };
};

const stagesOf = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `Stage ${index + 1}` }));

describe('Review workflows validation service - license limits', () => {
  describe('a license limit below the maximum', () => {
    const feature = reviewWorkflowsFeature({ numberOfWorkflows: 3, stagesPerWorkflow: 5 });

    it('allows workflows up to the license limit', async () => {
      const { strapi, countWorkflows } = createStrapiMock(feature);
      const validation = createValidationService({ strapi });
      countWorkflows.mockResolvedValue(2);

      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();
    });

    it('rejects a workflow beyond the license limit', async () => {
      const { strapi, countWorkflows } = createStrapiMock(feature);
      const validation = createValidationService({ strapi });
      countWorkflows.mockResolvedValue(3);

      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
    });

    it('rejects a workflow with more stages than the license limit', () => {
      const { strapi } = createStrapiMock(feature);
      const validation = createValidationService({ strapi });

      expect(() => validation.validateWorkflowStages(stagesOf(5))).not.toThrow();
      expect(() => validation.validateWorkflowStages(stagesOf(6))).toThrow(ERRORS.STAGES_LIMIT);
    });

    it('is read from a numeric string', async () => {
      const { strapi, countWorkflows } = createStrapiMock(
        reviewWorkflowsFeature({ numberOfWorkflows: '3', stagesPerWorkflow: '5' })
      );
      const validation = createValidationService({ strapi });

      countWorkflows.mockResolvedValue(2);
      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();

      countWorkflows.mockResolvedValue(3);
      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);

      expect(() => validation.validateWorkflowStages(stagesOf(5))).not.toThrow();
      expect(() => validation.validateWorkflowStages(stagesOf(6))).toThrow(ERRORS.STAGES_LIMIT);
    });
  });

  describe.each([
    ['the feature has no options', reviewWorkflowsFeature()],
    ['the options omit the limits', reviewWorkflowsFeature({})],
    ['the feature is not in the license', undefined],
    [
      'the limits are null',
      reviewWorkflowsFeature({ numberOfWorkflows: null, stagesPerWorkflow: null }),
    ],
    [
      'the limits are empty strings',
      reviewWorkflowsFeature({ numberOfWorkflows: '', stagesPerWorkflow: '' }),
    ],
    [
      'the limits are not numbers',
      reviewWorkflowsFeature({ numberOfWorkflows: 'abc', stagesPerWorkflow: 'abc' }),
    ],
    ['the limits are 0', reviewWorkflowsFeature({ numberOfWorkflows: 0, stagesPerWorkflow: 0 })],
    [
      'the limits are negative',
      reviewWorkflowsFeature({ numberOfWorkflows: -1, stagesPerWorkflow: -1 }),
    ],
  ])('falls back to the default when %s', (_, feature) => {
    it('for workflows', async () => {
      const { strapi, countWorkflows } = createStrapiMock(feature);
      const validation = createValidationService({ strapi });

      countWorkflows.mockResolvedValue(DEFAULT_NUMBER_OF_WORKFLOWS - 1);
      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();

      countWorkflows.mockResolvedValue(DEFAULT_NUMBER_OF_WORKFLOWS);
      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
    });

    it('for stages', () => {
      const { strapi } = createStrapiMock(feature);
      const validation = createValidationService({ strapi });

      expect(() =>
        validation.validateWorkflowStages(stagesOf(DEFAULT_STAGES_PER_WORKFLOW))
      ).not.toThrow();
      expect(() =>
        validation.validateWorkflowStages(stagesOf(DEFAULT_STAGES_PER_WORKFLOW + 1))
      ).toThrow(ERRORS.STAGES_LIMIT);
    });
  });

  describe('a license limit above the default', () => {
    const feature = reviewWorkflowsFeature({
      numberOfWorkflows: 200_000,
      stagesPerWorkflow: 200_000,
    });

    it('is applied in full for workflows', async () => {
      const { strapi, countWorkflows } = createStrapiMock(feature);
      const validation = createValidationService({ strapi });

      countWorkflows.mockResolvedValue(DEFAULT_NUMBER_OF_WORKFLOWS);
      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();

      countWorkflows.mockResolvedValue(199_999);
      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();

      countWorkflows.mockResolvedValue(200_000);
      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
    });

    it('is applied in full for stages', () => {
      const { strapi } = createStrapiMock(feature);
      const validation = createValidationService({ strapi });

      expect(() =>
        validation.validateWorkflowStages(stagesOf(DEFAULT_STAGES_PER_WORKFLOW + 1))
      ).not.toThrow();
      expect(() => validation.validateWorkflowStages(stagesOf(200_000))).not.toThrow();
      expect(() => validation.validateWorkflowStages(stagesOf(200_001))).toThrow(
        ERRORS.STAGES_LIMIT
      );
    });
  });

  describe('a license that changes after boot', () => {
    it('applies a lowered limit without a restart', async () => {
      const { strapi, countWorkflows, setFeature } = createStrapiMock(
        reviewWorkflowsFeature({ numberOfWorkflows: 10, stagesPerWorkflow: 10 })
      );
      const validation = createValidationService({ strapi });
      countWorkflows.mockResolvedValue(5);

      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();
      expect(() => validation.validateWorkflowStages(stagesOf(5))).not.toThrow();

      setFeature(reviewWorkflowsFeature({ numberOfWorkflows: 3, stagesPerWorkflow: 3 }));

      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
      expect(() => validation.validateWorkflowStages(stagesOf(5))).toThrow(ERRORS.STAGES_LIMIT);
    });

    it('applies a raised limit without a restart', async () => {
      const { strapi, countWorkflows, setFeature } = createStrapiMock(
        reviewWorkflowsFeature({ numberOfWorkflows: 3, stagesPerWorkflow: 3 })
      );
      const validation = createValidationService({ strapi });
      countWorkflows.mockResolvedValue(5);

      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
      expect(() => validation.validateWorkflowStages(stagesOf(5))).toThrow(ERRORS.STAGES_LIMIT);

      setFeature(reviewWorkflowsFeature({ numberOfWorkflows: 10, stagesPerWorkflow: 10 }));

      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();
      expect(() => validation.validateWorkflowStages(stagesOf(5))).not.toThrow();
    });
  });
});
