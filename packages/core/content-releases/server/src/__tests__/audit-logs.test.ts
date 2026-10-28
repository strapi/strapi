import { registerAuditEvents, runAsSystem } from '../audit-logs';

describe('runAsSystem', () => {
  it('runs the work inside a context carrying the system origin', async () => {
    const run = jest.fn(async (_ctx: unknown, cb: () => Promise<void>) => {
      await cb();
    });
    const strapi = { requestContext: { run } } as any;

    const result = await runAsSystem({ strapi }, 'scheduler', async () => 42);

    expect(result).toBe(42);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        state: { auditSource: 'scheduler' },
        // Some context readers dereference request.url
        request: { url: '' },
      }),
      expect.any(Function)
    );
  });
});

describe('transformers', () => {
  // Captures what registerAuditEvents registers, to call each transformer directly
  const transformers: Record<string, (...args: any[]) => any> = {};

  beforeAll(() => {
    registerAuditEvents({
      registerEvent(name: string, transform: any) {
        transformers[name] = transform;
      },
    });
  });

  it('registers every audited event', () => {
    expect(Object.keys(transformers).sort()).toEqual([
      'release.create',
      'release.delete',
      'release.entry.add',
      'release.entry.remove',
      'release.entry.update',
      'release.settings.update',
      'release.trigger',
      'release.update',
    ]);
  });

  it('release.create carries the schedule when there is one', () => {
    expect(
      transformers['release.create']({
        releaseId: 1,
        name: 'March',
        scheduledAt: '2026-09-01T10:00:00.000Z',
        timezone: 'Europe/Paris',
      })
    ).toEqual({
      resource: { type: 'release', id: 1, name: 'March' },
      details: {
        isScheduled: true,
        scheduledAt: '2026-09-01T10:00:00.000Z',
        timezone: 'Europe/Paris',
      },
    });

    expect(transformers['release.create']({ releaseId: 1, name: 'March' })).toEqual({
      resource: { type: 'release', id: 1, name: 'March' },
      details: { isScheduled: false },
    });
  });

  it('release.update passes the change set through', () => {
    expect(
      transformers['release.update']({
        releaseId: 1,
        name: 'After',
        changes: { name: { before: 'Before', after: 'After' } },
      })
    ).toEqual({
      resource: { type: 'release', id: 1, name: 'After' },
      details: { changes: { name: { before: 'Before', after: 'After' } } },
    });
  });

  it('release.delete carries the resource alone', () => {
    expect(transformers['release.delete']({ releaseId: 1, name: 'March' })).toEqual({
      resource: { type: 'release', id: 1, name: 'March' },
    });
  });

  it('release.trigger reports both outcomes', () => {
    expect(
      transformers['release.trigger']({
        releaseId: 1,
        name: 'March',
        outcome: 'success',
        published: 2,
        unpublished: 1,
      })
    ).toEqual({
      resource: { type: 'release', id: 1, name: 'March' },
      outcome: 'success',
      details: { published: 2, unpublished: 1, failed: 0 },
    });

    expect(
      transformers['release.trigger']({
        releaseId: 1,
        name: 'March',
        outcome: 'failure',
        reason: 'ValidationError',
      })
    ).toEqual({
      resource: { type: 'release', id: 1, name: 'March' },
      outcome: 'failure',
      details: { reason: 'ValidationError' },
    });

    // A custom error class can put arbitrary text in its name
    expect(
      transformers['release.trigger']({
        releaseId: 1,
        name: 'March',
        outcome: 'failure',
        reason: 'X'.repeat(500),
      }).details.reason
    ).toHaveLength(100);

    // No counts, no claims: a success whose counts could not be read omits details
    expect(
      transformers['release.trigger']({ releaseId: 1, name: 'March', outcome: 'success' })
    ).toEqual({
      resource: { type: 'release', id: 1, name: 'March' },
      outcome: 'success',
    });
  });

  it('release.entry events carry the entry and the action type', () => {
    const event = {
      releaseId: 1,
      name: 'March',
      contentType: 'api::article.article',
      entryDocumentId: 'doc1',
      locale: 'en',
    };
    const entry = { contentType: 'api::article.article', documentId: 'doc1', locale: 'en' };
    const resource = { type: 'release', id: 1, name: 'March' };

    expect(transformers['release.entry.add']({ ...event, type: 'publish' })).toEqual({
      resource,
      details: { entry, actionType: 'publish' },
    });
    expect(
      transformers['release.entry.update']({ ...event, from: 'publish', to: 'unpublish' })
    ).toEqual({
      resource,
      details: { entry, actionType: { before: 'publish', after: 'unpublish' } },
    });
    expect(transformers['release.entry.remove'](event)).toEqual({
      resource,
      details: { entry },
    });
  });

  it('release.entry events default a missing locale to null', () => {
    expect(
      transformers['release.entry.add']({
        releaseId: 1,
        name: 'March',
        contentType: 'api::article.article',
        entryDocumentId: 'doc1',
        type: 'publish',
      }).details.entry.locale
    ).toBeNull();
  });

  it('release.settings.update targets the release feature', () => {
    expect(
      transformers['release.settings.update']({
        changes: { defaultTimezone: { before: null, after: 'Europe/Paris' } },
      })
    ).toEqual({
      resource: { type: 'release' },
      details: { changes: { defaultTimezone: { before: null, after: 'Europe/Paris' } } },
    });
  });
});
