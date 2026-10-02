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
    it('reads the workflow limits from the top level of the feature', async () => {
      const limits = await registerWithFeature({
        name: 'review-workflows',
        numberOfWorkflows: 3,
        stagesPerWorkflow: 4,
      });

      expect(limits).toMatchObject({ numberOfWorkflows: 3, stagesPerWorkflow: 4 });
    });

    it('ignores the limits in the feature options', async () => {
      const limits = await registerWithFeature({
        name: 'review-workflows',
        options: { numberOfWorkflows: 3, stagesPerWorkflow: 4 },
      });

      expect(limits).toMatchObject({
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
