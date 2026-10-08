import type { Core } from '@strapi/types';
import { ERRORS } from '../../constants/workflows';
import validationFactory from '../../services/validation';
import { validateWorkflowCreate, validateWorkflowUpdate } from '../review-workflows';

const stagesOf = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `Stage ${index + 1}` }));

const validationServiceWithLicense = (options?: Record<string, unknown>) =>
  validationFactory({
    strapi: {
      ee: { features: { get: () => ({ name: 'review-workflows', options }) } },
    } as unknown as Core.Strapi,
  });

// The workflows controller runs these request schemas before the workflows service checks the
// license limit, so a stage cap in the schema would win over a license that allows more stages.
describe('Review workflows request validation - stage count', () => {
  test('a create request with more than 200 stages passes the request schema', async () => {
    await expect(
      validateWorkflowCreate({ name: 'Workflow', stages: stagesOf(201) })
    ).resolves.toMatchObject({ stages: stagesOf(201) });
  });

  test('an update request with more than 200 stages passes the request schema', async () => {
    await expect(validateWorkflowUpdate({ stages: stagesOf(201) })).resolves.toMatchObject({
      stages: stagesOf(201),
    });
  });

  test('a license allowing more than 200 stages accepts 201 stages', async () => {
    const { stages } = await validateWorkflowCreate({ name: 'Workflow', stages: stagesOf(201) });

    expect(() =>
      validationServiceWithLicense({ stagesPerWorkflow: 500 }).validateWorkflowStages(stages)
    ).not.toThrow();
  });

  test('a license without a stage limit still rejects 201 stages with the default', async () => {
    const { stages } = await validateWorkflowCreate({ name: 'Workflow', stages: stagesOf(201) });

    expect(() => validationServiceWithLicense().validateWorkflowStages(stages)).toThrow(
      ERRORS.STAGES_LIMIT
    );
  });
});
