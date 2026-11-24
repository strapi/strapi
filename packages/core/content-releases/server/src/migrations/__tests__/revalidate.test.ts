import { setImmediate } from 'node:timers/promises';

import type { Core, Schema } from '@strapi/types';

import { revalidateChangedContentTypes } from '..';

const revalidatePlannedActions = jest.fn();
const logError = jest.fn();

const strapi = {
  // Startup runs outside a transaction
  db: { inTransaction: () => false },
  plugin: () => ({ service: () => ({ revalidatePlannedActions }) }),
  log: { error: logError },
} as unknown as Core.Strapi;

const contentType = (attributes: Record<string, unknown>, draftAndPublish = true) =>
  ({ options: { draftAndPublish }, attributes }) as unknown as Schema.ContentType;

describe('revalidateChangedContentTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    revalidatePlannedActions.mockResolvedValue(undefined);
  });

  it('revalidates the planned actions of the content types whose attributes changed', async () => {
    await revalidateChangedContentTypes(
      {
        oldContentTypes: {
          'api::changed.changed': contentType({ title: { type: 'string' } }),
          'api::unchanged.unchanged': contentType({ title: { type: 'string' } }),
          'api::deleted.deleted': contentType({ title: { type: 'string' } }),
          'api::no-draft.no-draft': contentType({ title: { type: 'string' } }, false),
          // Its actions are removed (deleteActionsOnDisableDraftAndPublish), not revalidated
          'api::lost-draft.lost-draft': contentType({ title: { type: 'string' } }),
        },
        contentTypes: {
          'api::changed.changed': contentType({ title: { type: 'string', required: true } }),
          'api::unchanged.unchanged': contentType({ title: { type: 'string' } }),
          'api::no-draft.no-draft': contentType({ title: { type: 'text' } }, false),
          'api::lost-draft.lost-draft': contentType({ title: { type: 'text' } }, false),
        },
      },
      { strapi }
    );

    expect(revalidatePlannedActions.mock.calls).toStrictEqual([
      [{ contentType: { $in: ['api::changed.changed'] } }],
    ]);
  });

  it('does nothing when no content type changed', async () => {
    const unchanged = { 'api::a.a': contentType({ title: { type: 'string' } }) };

    await revalidateChangedContentTypes(
      { oldContentTypes: unchanged, contentTypes: unchanged },
      { strapi }
    );

    expect(revalidatePlannedActions).not.toHaveBeenCalled();
  });

  it('logs a failure instead of leaving an unhandled rejection', async () => {
    revalidatePlannedActions.mockRejectedValue(new Error('revalidation failed'));

    await revalidateChangedContentTypes(
      {
        oldContentTypes: { 'api::a.a': contentType({ title: { type: 'string' } }) },
        contentTypes: { 'api::a.a': contentType({ title: { type: 'text' } }) },
      },
      { strapi }
    );
    // Not awaited by startup: let it settle
    await setImmediate();

    expect(logError).toHaveBeenCalledWith(
      'Error while revalidating release actions after a content type change',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  // The core store table exists but has no saved schemas, e.g. after a first start that failed
  // before saving them. Core then passes `null`, which the input type does not declare.
  it('skips revalidation without saved schemas', async () => {
    await expect(
      revalidateChangedContentTypes(
        {
          oldContentTypes: null as unknown as Record<string, Schema.ContentType>,
          contentTypes: { 'api::a.a': contentType({ title: { type: 'string' } }) },
        },
        { strapi }
      )
    ).resolves.toBeUndefined();

    expect(revalidatePlannedActions).not.toHaveBeenCalled();
  });

  // Draft and publish adds `publishedAt` with a function default; the core store drops it
  it('skips revalidation when attributes only differ by values JSON drops', async () => {
    const liveAttributes = {
      title: { type: 'string' },
      publishedAt: { type: 'datetime', default: () => new Date() },
    };
    const savedAttributes = JSON.parse(JSON.stringify(liveAttributes));

    await revalidateChangedContentTypes(
      {
        oldContentTypes: { 'api::a.a': contentType(savedAttributes) },
        contentTypes: { 'api::a.a': contentType(liveAttributes) },
      },
      { strapi }
    );

    expect(revalidatePlannedActions).not.toHaveBeenCalled();
  });
});
