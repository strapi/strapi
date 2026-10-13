import { beforeEach, describe, expect, test, vi } from 'vitest';
import assigneesFactory from '../assignees';

const { emitAudit, userExists } = vi.hoisted(() => ({
  emitAudit: vi.fn(),
  userExists: vi.fn().mockResolvedValue(true),
}));

vi.mock('@strapi/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@strapi/utils')>();
  return {
    ...actual,
    emitAudit,
  };
});

vi.mock('../../utils', () => ({
  getService: vi.fn(() => ({ sendDidEditAssignee: vi.fn() })),
  getAdminService: vi.fn(() => ({ exists: userExists })),
}));

const model = 'api::article.article';
const entity = { id: 7, documentId: 'doc1', locale: 'en', updatedAt: '2026-09-24T10:00:00.000Z' };

const createStrapiMock = ({ before, after }: { before: number | null; after: number | null }) => {
  const knexUpdate = vi.fn();

  return {
    db: {
      query: vi.fn(() => ({
        findOne: vi.fn().mockResolvedValue({
          strapi_assignee: before === null ? null : { id: before },
        }),
      })),
      metadata: { get: vi.fn(() => ({ tableName: 'articles' })) },
      connection: vi.fn(() => ({ where: vi.fn(() => ({ update: knexUpdate })) })),
    },
    documents: vi.fn(() => ({
      update: vi.fn().mockResolvedValue({
        ...entity,
        strapi_assignee: after === null ? null : { id: after },
      }),
    })),
  };
};

describe('review-workflows assignees service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userExists.mockResolvedValue(true);
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
