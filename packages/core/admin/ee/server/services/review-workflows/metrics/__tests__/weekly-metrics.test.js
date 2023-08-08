'use strict';

const weeklyMetrics = require('../weekly-metrics');

jest.mock('../../../../../../server/utils', () => {
  return {
    getService: jest.fn(() => {
      const workflowsMock = {
        find: jest.fn(() => [
          {
            id: 1,
            stages: [{ id: 1, name: 'To Do' }],
            contentTypes: [{ uid: 'test-model' }],
          },
          {
            id: 2,
            stages: [
              { id: 2, name: 'To Do' },
              { id: 3, name: 'In Progress' },
            ],
            contentTypes: [{ uid: 'test-model-1' }],
          },
          {
            id: 3,
            stages: [
              { id: 4, name: 'To Do' },
              { id: 5, name: 'In Progress' },
              { id: 6, name: 'Ready to Review' },
            ],
          },
          {
            id: 4,
            stages: [
              { id: 7, name: 'To Do' },
              { id: 8, name: 'In Progress' },
              { id: 9, name: 'Ready to Review' },
              { id: 10, name: 'Reviewed' },
            ],
            contentTypes: [{ uid: 'test-model-2' }],
          },
        ]),
      };

      return {
        ...workflowsMock,
      };
    }),
  };
});

describe('Review workflows - Weekly Metrics', () => {
  describe('computeMetrics', () => {
    test('Computes the correct workflow metrics', async () => {
      const service = weeklyMetrics({ strapi: {} });

      const metrics = await service.computeMetrics();
      expect(metrics).toEqual({
        numberOfActiveWorkflows: 4,
        avgStagesCount: 2.5,
        maxStagesCount: 4,
        activatedContentTypes: 3,
      });
    });
  });
});
