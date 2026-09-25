import { emitAudit } from '@strapi/utils';
import assigneesFactory from '../assignees';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

const userExists = jest.fn().mockResolvedValue(true);

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({ sendDidEditAssignee: jest.fn() })),
  getAdminService: jest.fn(() => ({ exists: userExists })),
}));

const model = 'api::article.article';
const entity = { id: 7, documentId: 'doc1', locale: 'en', updatedAt: '2026-09-24T10:00:00.000Z' };

const createStrapiMock = ({ before, after }: { before: number | null; after: number | null }) => {
  const knexUpdate = jest.fn();

  return {
    db: {
      query: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue({
          strapi_assignee: before === null ? null : { id: before },
        }),
      })),
      metadata: { get: jest.fn(() => ({ tableName: 'articles' })) },
      connection: jest.fn(() => ({ where: jest.fn(() => ({ update: knexUpdate })) })),
    },
    documents: jest.fn(() => ({
      update: jest.fn().mockResolvedValue({
        ...entity,
        strapi_assignee: after === null ? null : { id: after },
      }),
    })),
  };
};

describe('review-workflows assignees service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('records the assignee change', async () => {
    const strapi = createStrapiMock({ before: 1, after: 2 });
    const service = assigneesFactory({ strapi: strapi as any });

    await service.updateEntityAssignee(entity, model, '2');

    expect(emitAudit).toHaveBeenCalledWith({ strapi }, 'entry.assignee.update', {
      uid: model,
      documentId: 'doc1',
      locale: 'en',
      changes: { assignee: { before: 1, after: 2 } },
    });
  });

  test('records an unassignment', async () => {
    const strapi = createStrapiMock({ before: 1, after: null });
    const service = assigneesFactory({ strapi: strapi as any });

    await service.updateEntityAssignee(entity, model, null);

    expect(emitAudit).toHaveBeenCalledWith(
      { strapi },
      'entry.assignee.update',
      expect.objectContaining({ changes: { assignee: { before: 1, after: null } } })
    );
  });

  test('writes nothing when the assignee did not change', async () => {
    const strapi = createStrapiMock({ before: 2, after: 2 });
    const service = assigneesFactory({ strapi: strapi as any });

    await service.updateEntityAssignee(entity, model, '2');

    expect(emitAudit).not.toHaveBeenCalled();
  });
});
