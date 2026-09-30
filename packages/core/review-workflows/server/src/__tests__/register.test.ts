import register from '../register';
import createValidationService from '../services/validation';
import { MAX_STAGES_PER_WORKFLOW, MAX_WORKFLOWS } from '../constants/workflows';

const registerWithFeature = async (feature: unknown) => {
  const validationService = createValidationService({ strapi: {} as any });
  const hook = { register: jest.fn().mockReturnThis() };

  // The global strapi setter derives `service()` and `plugin()` from these maps
  global.strapi = {
    hook: jest.fn(() => hook),
    admin: { services: { 'persist-tables': {} } },
    plugins: { 'review-workflows': { services: { validation: validationService } } },
    server: { router: { use: jest.fn() } },
    contentTypes: {},
    ee: { features: { get: jest.fn(() => feature) } },
  } as any;

  await register({ strapi: global.strapi });

  return validationService.limits;
};

describe('register', () => {
  describe('license limits', () => {
    it('reads the workflow limits from the feature options', async () => {
      const limits = await registerWithFeature({
        name: 'review-workflows',
        options: { numberOfWorkflows: 3 },
      });

      expect(limits).toEqual({ numberOfWorkflows: 3, stagesPerWorkflow: MAX_STAGES_PER_WORKFLOW });
    });

    it('reads the stage limit from the feature options', async () => {
      const limits = await registerWithFeature({
        name: 'review-workflows',
        options: { stagesPerWorkflow: 4 },
      });

      expect(limits).toEqual({ numberOfWorkflows: MAX_WORKFLOWS, stagesPerWorkflow: 4 });
    });

    it('uses the maximum limits when the feature has no options', async () => {
      const limits = await registerWithFeature({ name: 'review-workflows', options: {} });

      expect(limits).toEqual({
        numberOfWorkflows: MAX_WORKFLOWS,
        stagesPerWorkflow: MAX_STAGES_PER_WORKFLOW,
      });
    });

    it('uses the maximum limits when the feature is missing', async () => {
      const limits = await registerWithFeature(undefined);

      expect(limits).toEqual({
        numberOfWorkflows: MAX_WORKFLOWS,
        stagesPerWorkflow: MAX_STAGES_PER_WORKFLOW,
      });
    });
  });
});
