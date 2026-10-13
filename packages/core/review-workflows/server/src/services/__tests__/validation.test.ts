import type { Core } from '@strapi/types';
import {
  ERRORS,
  DEFAULT_NUMBER_OF_WORKFLOWS,
  DEFAULT_STAGES_PER_WORKFLOW,
} from '../../constants/workflows';
import validationFactory from '../validation';

type Feature = { name: string; options?: Record<string, unknown> } | undefined;

const reviewWorkflowsFeature = (options?: Record<string, unknown>): Feature => ({
  name: 'review-workflows',
  ...(options && { options }),
});

const createStrapiMock = (initialFeature: Feature) => {
  let feature = initialFeature;
  const countWorkflows = jest.fn();

  const services: Record<string, unknown> = {
    workflows: { count: countWorkflows },
  };

  const strapi = {
    ee: { features: { get: jest.fn(() => feature) } },
    plugin: jest.fn(() => ({ service: jest.fn((name: string) => services[name]) })),
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

    test('is read from a numeric string', async () => {
      const { strapi, countWorkflows } = createStrapiMock(
        reviewWorkflowsFeature({ numberOfWorkflows: '3', stagesPerWorkflow: '5' })
      );
      const validation = validationFactory({ strapi });

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
    test('for workflows', async () => {
      const { strapi, countWorkflows } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });

      countWorkflows.mockResolvedValue(DEFAULT_NUMBER_OF_WORKFLOWS - 1);
      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();

      countWorkflows.mockResolvedValue(DEFAULT_NUMBER_OF_WORKFLOWS);
      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
    });

    test('for stages', () => {
      const { strapi } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });

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

    test('is applied in full for workflows', async () => {
      const { strapi, countWorkflows } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });

      countWorkflows.mockResolvedValue(DEFAULT_NUMBER_OF_WORKFLOWS);
      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();

      countWorkflows.mockResolvedValue(199_999);
      await expect(validation.validateWorkflowCount(1)).resolves.toBeUndefined();

      countWorkflows.mockResolvedValue(200_000);
      await expect(validation.validateWorkflowCount(1)).rejects.toThrow(ERRORS.WORKFLOWS_LIMIT);
    });

    test('is applied in full for stages', () => {
      const { strapi } = createStrapiMock(feature);
      const validation = validationFactory({ strapi });

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
