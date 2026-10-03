import { beforeEach, describe, expect, test, vi } from 'vitest';
import workflowContentTypesFactory from '../workflow-content-types';

const { getAssignedWorkflows } = vi.hoisted(() => ({
  getAssignedWorkflows: vi.fn(),
}));

vi.mock('../../utils', () => ({
  getService: vi.fn((name: string) =>
    name === 'workflows'
      ? { _getAssignedWorkflows: getAssignedWorkflows }
      : { updateEntitiesStage: vi.fn(), deleteAllEntitiesStage: vi.fn() }
  ),
}));

const createStrapiMock = () => {
  const update = vi.fn(async ({ where, data }: any) => ({
    id: where.id,
    name: 'Other',
    ...data,
  }));

  return {
    db: { query: vi.fn(() => ({ update })) },
    plugin: vi.fn(() => ({
      service: vi.fn(() => ({
        findConfiguration: vi.fn().mockResolvedValue({ options: {} }),
        updateConfiguration: vi.fn(),
      })),
    })),
  };
};

describe('review-workflows workflow content types service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('migrate returns one transfer per workflow that lost content types', async () => {
    getAssignedWorkflows
      .mockResolvedValueOnce([
        { id: 2, name: 'Other', contentTypes: ['api::a.a', 'api::b.b', 'api::c.c'] },
      ])
      .mockResolvedValueOnce([{ id: 2, name: 'Other', contentTypes: ['api::b.b', 'api::c.c'] }]);
    const service = workflowContentTypesFactory({ strapi: createStrapiMock() as any });

    const transfers = await service.migrate({
      srcContentTypes: [],
      destContentTypes: ['api::a.a', 'api::b.b'],
      stageId: 10,
    });

    expect(transfers).toEqual([
      {
        workflowId: 2,
        name: 'Other',
        before: ['api::a.a', 'api::b.b', 'api::c.c'],
        after: ['api::c.c'],
      },
    ]);
  });

  test('migrate returns no transfer when no other workflow had the content type', async () => {
    getAssignedWorkflows.mockResolvedValue([]);
    const service = workflowContentTypesFactory({ strapi: createStrapiMock() as any });

    await expect(
      service.migrate({ srcContentTypes: [], destContentTypes: ['api::a.a'], stageId: 10 })
    ).resolves.toEqual([]);
  });
});
