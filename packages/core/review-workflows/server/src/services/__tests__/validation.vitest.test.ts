import { describe, expect, it, vi } from 'vitest';
import createValidationService from '../validation';
import { ERRORS } from '../../constants/workflows';

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

  it('clamps the license limits to the supported range', () => {
    const { validation } = createWith(
      featureWith({ numberOfWorkflows: 500, stagesPerWorkflow: -1 })
    );

    expect(validation.getLimits()).toEqual({ numberOfWorkflows: 200, stagesPerWorkflow: 1 });
  });
});
