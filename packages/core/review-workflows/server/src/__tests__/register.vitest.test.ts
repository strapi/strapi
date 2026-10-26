import { afterEach, describe, expect, it, vi } from 'vitest';
import register from '../register';
import createValidationService from '../services/validation';
import { ERRORS } from '../constants/workflows';

/**
 * Runs the plugin `register` against a license feature and returns the real validation service
 * it configured. The workflow and stage counts are the only stubbed data sources.
 */
const registerWith = async (feature: unknown, { workflows = 0, stages = 0 } = {}) => {
  const services: Record<string, any> = {
    workflows: { count: vi.fn().mockResolvedValue(workflows) },
    stages: { count: vi.fn().mockResolvedValue(stages) },
  };
  const hook = { register: vi.fn().mockReturnThis() };

  const strapi = {
    hook: () => hook,
    server: { router: { use: vi.fn() } },
    contentTypes: {},
    get: () => ({ extend: vi.fn() }),
    service: () => ({ removePersistedTablesWithSuffix: vi.fn(), persistTables: vi.fn() }),
    plugin: () => ({ service: (name: string) => services[name] }),
    ee: {
      features: { get: (name: string) => (name === 'review-workflows' ? feature : undefined) },
      entitlements: { register: vi.fn() },
    },
  } as any;
  services.validation = createValidationService({ strapi });
  // `persistRWOnDowngrade` resolves the admin service through `global.strapi`
  vi.stubGlobal('strapi', strapi);

  await register({ strapi });

  return services.validation;
};

describe('review-workflows register', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // The license stores the review workflows limits under `options`, as the entitlements code
  // and the admin `useLicenseLimits` hook read them.
  const feature = {
    name: 'review-workflows',
    options: { numberOfWorkflows: 2, stagesPerWorkflow: 3 },
  };

  it('applies the license limits to the validation service', async () => {
    const validation = await registerWith(feature);

    expect(validation.limits).toEqual({ numberOfWorkflows: 2, stagesPerWorkflow: 3 });
  });

  it('rejects a workflow above the license workflow limit', async () => {
    const validation = await registerWith(feature, { workflows: 2 });

    await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
  });

  it('rejects stages above the license stage limit', async () => {
    const validation = await registerWith(feature);

    expect(() =>
      validation.validateWorkflowStages([
        { name: 'a' },
        { name: 'b' },
        { name: 'c' },
        { name: 'd' },
      ])
    ).toThrow(ERRORS.STAGES_LIMIT);
  });

  it('keeps the default limits when the license does not list the feature', async () => {
    const validation = await registerWith(undefined);

    expect(validation.limits).toEqual({ numberOfWorkflows: 200, stagesPerWorkflow: 200 });
  });
});
