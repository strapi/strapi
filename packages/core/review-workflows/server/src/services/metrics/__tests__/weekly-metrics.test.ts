import type { Core } from '@strapi/types';

import weeklyMetricsFactory from '../weekly-metrics';

const findWorkflows = jest.fn();

jest.mock('../../../utils', () => ({
  getService: jest.fn((name: string) => {
    if (name === 'workflow-metrics') {
      return jest.requireActual('../index').default;
    }
    if (name === 'workflows') {
      return { find: findWorkflows };
    }
    return {};
  }),
}));

const send = jest.fn();
const setStore = jest.fn();

const strapiMock = {
  telemetry: { send },
  store: { get: jest.fn(async () => ({})), set: setStore },
} as unknown as Core.Strapi;

global.strapi = strapiMock;

describe('Review workflows weekly metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sendMetrics sends each computed metric as its own group property', async () => {
    findWorkflows.mockResolvedValue([
      { stages: [{}, {}], contentTypes: ['api::a.a'] },
      { stages: [{}, {}, {}, {}], contentTypes: ['api::b.b', 'api::c.c'] },
    ]);

    await weeklyMetricsFactory({ strapi: strapiMock }).sendMetrics();

    expect(send).toHaveBeenCalledWith('didSendReviewWorkflowPropertiesOnceAWeek', {
      groupProperties: {
        numberOfActiveWorkflows: 2,
        avgStagesCount: 3,
        maxStagesCount: 4,
        activatedContentTypes: 3,
      },
    });
    expect(setStore).toHaveBeenCalledWith(
      expect.objectContaining({ value: { lastWeeklyUpdate: expect.any(Number) } })
    );
  });
});
