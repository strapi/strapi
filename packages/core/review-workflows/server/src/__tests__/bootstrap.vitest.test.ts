import { afterEach, describe, expect, it, vi } from 'vitest';
import bootstrap from '../bootstrap';
import createValidationService from '../services/validation';
import defaultStages from '../constants/default-stages.json';

/**
 * Runs the plugin `bootstrap` on an empty database, with the real validation service registered
 * with the license `stagesPerWorkflow`. Returns the data of the default workflow it created.
 */
const bootWith = async (stagesPerWorkflow: number) => {
  const services: Record<string, any> = {
    stages: { count: vi.fn().mockResolvedValue(0) },
    'workflow-weekly-metrics': { registerCron: vi.fn() },
    'document-service-middlewares': {},
  };
  const validation = createValidationService({ strapi: {} as any });
  validation.register({ numberOfWorkflows: 200, stagesPerWorkflow });
  services.validation = validation;
  // The workflows service validates the stages against the limits before creating the workflow
  const create = vi.fn(async ({ data }: { data: { stages: unknown[] } }) => {
    validation.validateWorkflowStages(data.stages);
    return data;
  });
  services.workflows = { count: vi.fn().mockResolvedValue(0), create };

  const strapi = {
    plugin: () => ({ service: (name: string) => services[name] }),
    service: () => ({ actionProvider: { registerMany: vi.fn() } }),
    get: () => ({ addAllowedEvent: vi.fn() }),
    has: () => false,
    documents: { use: vi.fn() },
  } as any;
  // `initDefaultWorkflow` resolves the services through `global.strapi`
  vi.stubGlobal('strapi', strapi);

  await bootstrap({ strapi });

  expect(create).toHaveBeenCalledTimes(1);
  return create.mock.calls[0][0].data;
};

describe('review-workflows bootstrap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([1, 2, 3])(
    'creates the default workflow with the first %i stages when the license allows fewer than 4',
    async (stagesPerWorkflow) => {
      const workflow = await bootWith(stagesPerWorkflow);

      expect(workflow.stages).toEqual(defaultStages.slice(0, stagesPerWorkflow));
    }
  );

  it.each([4, 5, 200])(
    'creates the default workflow with all 4 stages when the license allows %i',
    async (stagesPerWorkflow) => {
      const workflow = await bootWith(stagesPerWorkflow);

      expect(workflow.stages).toEqual(defaultStages);
    }
  );
});
