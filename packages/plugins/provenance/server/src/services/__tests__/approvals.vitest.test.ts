import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashValue } from '../../domain/hash';
import { createApprovalsService, StaleApprovalError } from '../approvals';

const UID = 'api::article.article';

describe('approvals service', () => {
  let current: Record<string, unknown>;
  let services: Record<string, any>;
  let service: ReturnType<typeof createApprovalsService>;

  const agent = { id: 12, name: 'Blog Drafter' };
  const hashes = () => ({ title: hashValue(current.title) });

  beforeEach(() => {
    current = { title: 'Generated', body: 'Generated too', locale: 'en' };

    services = {
      provenance: {
        lockDocument: vi.fn(),
        markReviewed: vi.fn(),
        syncAcrossLocales: vi.fn(),
        getForEntry: vi.fn(async () => ({ title: { source: 'ai-generated' } })),
        findUnreviewedAi: vi.fn(async () => ['title']),
      },
      values: {
        getTracked: () => ['title', 'body'],
        read: vi.fn(async () => ({ ...current })),
      },
      request: {
        withExecution: vi.fn(async (_execution, run) => run()),
      },
    };

    service = createApprovalsService({
      strapi: {
        contentTypes: {
          [UID]: { options: { draftAndPublish: true }, attributes: { locale: {}, title: {} } },
        },
        plugin: () => ({ service: (name: string) => services[name] }),
        db: { transaction: (run: () => Promise<unknown>) => run() },
        eventHub: { emit: vi.fn() },
        log: { error: vi.fn() },
      } as any,
    });
  });

  it('gives the hash of each field and the AI fields left to review', async () => {
    const state = await service.getReviewState({ uid: UID, documentId: 'd1' });

    expect(state).toMatchObject({
      locale: 'en',
      fields: { title: { source: 'ai-generated', hash: hashValue('Generated') } },
      toReview: ['title'],
    });
  });

  it('refuses an approval of values that changed since they were shown', async () => {
    const shown = hashes();
    current.title = 'Edited by the agent after the diff';
    const run = vi.fn();

    await expect(
      service.executeApproved(
        { uid: UID, documentId: 'd1', action: 'publish', agent, decidedBy: 1, hashes: shown },
        run
      )
    ).rejects.toBeInstanceOf(StaleApprovalError);

    expect(run).not.toHaveBeenCalled();
    expect(services.provenance.markReviewed).not.toHaveBeenCalled();
  });

  it('takes the lock before comparing the values', async () => {
    await service.executeApproved(
      { uid: UID, documentId: 'd1', action: 'publish', agent, decidedBy: 1, hashes: hashes() },
      async () => undefined
    );

    expect(services.provenance.lockDocument.mock.invocationCallOrder[0]).toBeLessThan(
      services.values.read.mock.invocationCallOrder[0]
    );
  });

  it('reviews the shown fields before a publish runs, as the agent', async () => {
    const order: string[] = [];

    services.provenance.markReviewed.mockImplementation(async () => order.push('review'));

    const result = await service.executeApproved(
      { uid: UID, documentId: 'd1', action: 'publish', agent, decidedBy: 1, hashes: hashes() },
      async () => {
        order.push('publish');

        return 'published';
      }
    );

    expect(result).toBe('published');
    expect(order).toEqual(['review', 'publish']);
    expect(services.request.withExecution.mock.calls[0][0]).toMatchObject({ agent });
    expect(services.provenance.markReviewed).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ['title'], userId: 1 })
    );
  });

  it('reviews what a queued update changed, after it ran', async () => {
    await service.executeApproved(
      { uid: UID, documentId: 'd1', action: 'update', agent, decidedBy: 1, hashes: {} },
      async () => {
        current = { ...current, body: 'The queued edit' };
      }
    );

    expect(services.provenance.markReviewed).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ['body'], userId: 1 })
    );
  });

  it('reviews nothing for a delete', async () => {
    await service.executeApproved(
      { uid: UID, documentId: 'd1', action: 'delete', agent, decidedBy: 1, hashes: {} },
      async () => undefined
    );

    expect(services.provenance.markReviewed).not.toHaveBeenCalled();
  });

  it('refuses hashes of untracked fields', async () => {
    await expect(
      service.executeApproved(
        { uid: UID, documentId: 'd1', action: 'publish', agent, decidedBy: 1, hashes: { id: 'x' } },
        async () => undefined
      )
    ).rejects.toThrow('Fields without provenance');
  });
});
