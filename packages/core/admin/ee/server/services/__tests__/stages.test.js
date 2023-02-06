'use strict';

jest.mock('@strapi/strapi/lib/utils/ee', () => {
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

const stageFactory = require('../review-workflows/stages');
const { STAGE_MODEL_UID } = require('../../constants/workflows');

const stageMock = {
  id: 1,
  name: 'test',
  workflow: 1,
};

const entityServiceMock = {
  findOne: jest.fn(() => stageMock),
  findMany: jest.fn(() => [stageMock]),
};

const strapiMock = {
  entityService: entityServiceMock,
};

const stagesService = stageFactory({ strapi: strapiMock });

describe('Review workflows - Stages service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('find', () => {
    test('Should call entityService with the right model UID and ID', async () => {
      stagesService.find({ workflowId: 1 });

      expect(entityServiceMock.findOne).not.toBeCalled();
      expect(entityServiceMock.findMany).toBeCalled();
      expect(entityServiceMock.findMany).toBeCalledWith(STAGE_MODEL_UID, {
        filters: { workflow: 1 },
      });
    });
  });
  describe('findById', () => {
    test('Should call entityService with the right model UID', async () => {
      stagesService.findById(1, { workflowId: 1 });

      expect(entityServiceMock.findMany).not.toBeCalled();
      expect(entityServiceMock.findOne).toBeCalled();
      expect(entityServiceMock.findOne).toBeCalledWith(STAGE_MODEL_UID, 1, {
        filters: { workflow: 1 },
      });
    });
  });
});
