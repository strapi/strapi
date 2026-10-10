import type { Core } from '@strapi/types';
import workflowContentTypesFactory from '../workflow-content-types';

const updateEntitiesStage = jest.fn();
const deleteAllEntitiesStage = jest.fn();
const getAssignedWorkflows = jest.fn();

jest.mock('../../utils', () => ({
  getService: jest.fn((name: string) => {
    if (name === 'stages') {
      return { updateEntitiesStage, deleteAllEntitiesStage };
    }
    if (name === 'workflows') {
      return { _getAssignedWorkflows: getAssignedWorkflows };
    }
    return {};
  }),
}));

const ARTICLE_UID = 'api::article.article';

const createContentManagerMock = (storedOptions: Record<string, Record<string, unknown>> = {}) => ({
  // Mirrors the Content Manager service: the configuration is read from `contentType.uid`
  findConfiguration: jest.fn(async (contentType: { uid: string }) => ({
    uid: contentType.uid,
    options: storedOptions[contentType.uid],
  })),
  updateConfiguration: jest.fn(),
});

const createStrapiMock = (
  contentManagerService: ReturnType<typeof createContentManagerMock> = createContentManagerMock()
) => {
  const update = jest.fn(async ({ where, data }: any) => ({
    id: where.id,
    name: 'Other',
    ...data,
  }));

  return {
    plugin: jest.fn(() => ({ service: jest.fn(() => contentManagerService) })),
    db: { query: jest.fn(() => ({ update })) },
  } as unknown as Core.Strapi;
};

describe('Review workflows - Workflow content types service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAssignedWorkflows.mockResolvedValue([]);
  });

  test('migrate returns one transfer per workflow that lost content types', async () => {
    getAssignedWorkflows
      .mockResolvedValueOnce([
        { id: 2, name: 'Other', contentTypes: ['api::a.a', 'api::b.b', 'api::c.c'] },
      ])
      .mockResolvedValueOnce([{ id: 2, name: 'Other', contentTypes: ['api::b.b', 'api::c.c'] }]);
    const service = workflowContentTypesFactory({ strapi: createStrapiMock() });

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
    const service = workflowContentTypesFactory({ strapi: createStrapiMock() });

    await expect(
      service.migrate({ srcContentTypes: [], destContentTypes: ['api::a.a'], stageId: 10 })
    ).resolves.toEqual([]);
  });

  test('keeps the existing configuration options when a content type is assigned', async () => {
    const contentManagerService = createContentManagerMock({ [ARTICLE_UID]: { foo: 'bar' } });
    const service = workflowContentTypesFactory({
      strapi: createStrapiMock(contentManagerService),
    });

    await service.migrate({ srcContentTypes: [], destContentTypes: [ARTICLE_UID], stageId: 1 });

    expect(contentManagerService.findConfiguration).toHaveBeenCalledWith({ uid: ARTICLE_UID });
    expect(contentManagerService.updateConfiguration).toHaveBeenCalledWith(
      { uid: ARTICLE_UID },
      { options: { foo: 'bar', reviewWorkflows: true } }
    );
  });

  test('keeps the existing configuration options when a content type is unassigned', async () => {
    const contentManagerService = createContentManagerMock({
      [ARTICLE_UID]: { foo: 'bar', reviewWorkflows: true },
    });
    const service = workflowContentTypesFactory({
      strapi: createStrapiMock(contentManagerService),
    });

    await service.migrate({ srcContentTypes: [ARTICLE_UID], destContentTypes: [], stageId: 1 });

    expect(contentManagerService.findConfiguration).toHaveBeenCalledWith({ uid: ARTICLE_UID });
    expect(contentManagerService.updateConfiguration).toHaveBeenCalledWith(
      { uid: ARTICLE_UID },
      { options: { foo: 'bar', reviewWorkflows: false } }
    );
  });
});
