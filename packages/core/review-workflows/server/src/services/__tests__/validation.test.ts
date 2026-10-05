import type { Core } from '@strapi/types';
import { ERRORS, MAX_WORKFLOWS, MAX_STAGES_PER_WORKFLOW } from '../../constants/workflows';
import validationFactory from '../validation';

type Feature = { name: string; options?: Record<string, unknown> } | undefined;

const reviewWorkflowsFeature = (options?: Record<string, unknown>): Feature => ({
  name: 'review-workflows',
  ...(options && { options }),
});

const createStrapiMock = (initialFeature: Feature) => {
  let feature = initialFeature;
  const countWorkflows = jest.fn();
  const countStages = jest.fn();

  const services: Record<string, unknown> = {
    workflows: { count: countWorkflows },
    stages: { count: countStages },
  };

  const strapi = {
    ee: { features: { get: jest.fn(() => feature) } },
    plugin: jest.fn(() => ({ service: jest.fn((name: string) => services[name]) })),
  } as unknown as Core.Strapi;

  return {
    strapi,
    countWorkflows,
    countStages,
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

    test('allows workflows up to the license limit', async () => {
      const { strapi, countWorkflows } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });
      countWorkflows.mockResolvedValue(2);

      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();
    });

    test('rejects a workflow beyond the license limit', async () => {
      const { strapi, countWorkflows } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });
      countWorkflows.mockResolvedValue(3);

      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
    });

    test('rejects a workflow with more stages than the license limit', () => {
      const { strapi } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });

      expect(() => validation.validateWorkflowStages(stagesOf(5))).not.toThrow();
      expect(() => validation.validateWorkflowStages(stagesOf(6))).toThrow(ERRORS.STAGES_LIMIT);
    });

    test('rejects adding stages beyond the license limit to an existing workflow', async () => {
      const { strapi, countStages } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });

      countStages.mockResolvedValue(4);
      await expect(validation.validateWorkflowCountStages(1, 1)).resolves.toBeUndefined();

      countStages.mockResolvedValue(5);
      await expect(validation.validateWorkflowCountStages(1, 1)).rejects.toThrow(
        ERRORS.STAGES_LIMIT
      );
    });
  });

  describe.each([
    ['the feature has no options', reviewWorkflowsFeature()],
    ['the options omit the limits', reviewWorkflowsFeature({})],
    ['the feature is not in the license', undefined],
  ])('falls back to the maximum when %s', (_, feature) => {
    test('for workflows', async () => {
      const { strapi, countWorkflows } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });

      countWorkflows.mockResolvedValue(MAX_WORKFLOWS - 1);
      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();

      countWorkflows.mockResolvedValue(MAX_WORKFLOWS);
      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
    });

    test('for stages', () => {
      const { strapi } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });

      expect(() =>
        validation.validateWorkflowStages(stagesOf(MAX_STAGES_PER_WORKFLOW))
      ).not.toThrow();
      expect(() =>
        validation.validateWorkflowStages(stagesOf(MAX_STAGES_PER_WORKFLOW + 1))
      ).toThrow(ERRORS.STAGES_LIMIT);
    });
  });

  describe('a license limit above the maximum', () => {
    const feature = reviewWorkflowsFeature({ numberOfWorkflows: 500, stagesPerWorkflow: 500 });

    test('is clamped for workflows', async () => {
      const { strapi, countWorkflows } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });
      countWorkflows.mockResolvedValue(MAX_WORKFLOWS);

      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
    });

    test('is clamped for stages', () => {
      const { strapi } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });

      expect(() =>
        validation.validateWorkflowStages(stagesOf(MAX_STAGES_PER_WORKFLOW + 1))
      ).toThrow(ERRORS.STAGES_LIMIT);
    });
  });

  describe('a license that changes after boot', () => {
    test('applies a lowered limit without a restart', async () => {
      const { strapi, countWorkflows, setFeature } = createStrapiMock(
        reviewWorkflowsFeature({ numberOfWorkflows: 10, stagesPerWorkflow: 10 })
      );
      const validation = validationFactory({ strapi });
      countWorkflows.mockResolvedValue(5);

      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();
      expect(() => validation.validateWorkflowStages(stagesOf(5))).not.toThrow();

      setFeature(reviewWorkflowsFeature({ numberOfWorkflows: 3, stagesPerWorkflow: 3 }));

      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
      expect(() => validation.validateWorkflowStages(stagesOf(5))).toThrow(ERRORS.STAGES_LIMIT);
    });

    test('applies a raised limit without a restart', async () => {
      const { strapi, countWorkflows, setFeature } = createStrapiMock(
        reviewWorkflowsFeature({ numberOfWorkflows: 3, stagesPerWorkflow: 3 })
      );
      const validation = validationFactory({ strapi });
      countWorkflows.mockResolvedValue(5);

      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
      expect(() => validation.validateWorkflowStages(stagesOf(5))).toThrow(ERRORS.STAGES_LIMIT);

      setFeature(reviewWorkflowsFeature({ numberOfWorkflows: 10, stagesPerWorkflow: 10 }));

      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();
      expect(() => validation.validateWorkflowStages(stagesOf(5))).not.toThrow();
    });
  });
});
