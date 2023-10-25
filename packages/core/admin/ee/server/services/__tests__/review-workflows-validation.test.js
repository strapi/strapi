'use strict';

jest.mock('@strapi/strapi/dist/utils/ee', () => {
  const eeModule = () => true;

  Object.assign(eeModule, {
    features: {
      isEnabled() {
        return true;
      },
      getEnabled() {
        return ['review-workflows'];
      },
    },
  });

  return eeModule;
});

jest.mock('../review-workflows/workflows/content-types', () => {
  return jest.fn(() => ({
    migrate: jest.fn(),
  }));
});

const validationServiceFactory = require('../review-workflows/validation');
const { MAX_WORKFLOWS, MAX_STAGES_PER_WORKFLOW } = require('../../constants/workflows');

const workflowsServiceMock = {
  count: jest.fn(() => 1),
};

const servicesMock = {
  'admin::workflows': workflowsServiceMock,
};

const strapiMock = {
  service: jest.fn((serviceName) => servicesMock[serviceName]),
};
let validationService;

describe('Review workflows - Validation service', () => {
  beforeEach(() => {
    validationService = validationServiceFactory({ strapi: strapiMock });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('register', () => {
    test('Limits object should be frozen after register', () => {
      validationService.register({ numberOfWorkflows: 2, stagesPerWorkflow: 10 });
      expect(validationService.limits.numberOfWorkflows).toEqual(2);
      expect(validationService.limits.stagesPerWorkflow).toEqual(10);
      expect(Object.isFrozen(validationService.limits)).toBe(true);
    });
    test(`Limits object shouldn't be frozen before register`, () => {
      expect(validationService.limits.numberOfWorkflows).toEqual(MAX_WORKFLOWS);
      expect(validationService.limits.stagesPerWorkflow).toEqual(MAX_STAGES_PER_WORKFLOW);
      expect(Object.isFrozen(validationService.limits)).toBe(false);
    });
    test('Limits object should not be modified after first register', () => {
      validationService.register({ numberOfWorkflows: 2, stagesPerWorkflow: 10 });
      expect(validationService.limits.numberOfWorkflows).toEqual(2);
      expect(validationService.limits.stagesPerWorkflow).toEqual(10);
      validationService.register({ workflows: 99, stagesPerWorkflow: 99 });
      expect(validationService.limits.numberOfWorkflows).toEqual(2);
      expect(validationService.limits.stagesPerWorkflow).toEqual(10);
    });
  });
  describe('validateWorkflowCount', () => {
    test('Should not throw because limit is not reached', async () => {
      validationService.register({ numberOfWorkflows: 2 });
      workflowsServiceMock.count.mockReturnValue(1);
      await expect(validationService.validateWorkflowCount()).resolves.not.toThrowError();
    });
    test('Should throw because limit is reached', async () => {
      validationService.register({ numberOfWorkflows: 2 });
      workflowsServiceMock.count.mockReturnValue(2);
      await expect(validationService.validateWorkflowCount(1)).rejects.toThrowError();
    });
  });
  describe('validateWorkflowStages', () => {
    test('Should not throw because limit is not reached and at least 1 stage', async () => {
      validationService.register({ stagesPerWorkflow: 2 });
      expect(() =>
        validationService.validateWorkflowStages([{ name: 'a' }, { name: 'b' }])
      ).not.toThrowError();
    });
    test('Should throw because limit is reached', async () => {
      validationService.register({ stagesPerWorkflow: 2 });
      expect(() => validationService.validateWorkflowStages([{}, {}, {}])).toThrowError();
    });
    test('Should throw because stage name is duplicated', async () => {
      validationService.register({ stagesPerWorkflow: 200 });
      expect(() =>
        validationService.validateWorkflowStages([{ name: 'a' }, { name: 'a' }])
      ).toThrowError();
    });
  });
});
