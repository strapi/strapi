import { setImmediate } from 'node:timers/promises';

import type { Core, Schema } from '@strapi/types';

import { revalidateChangedContentTypes } from '..';

const revalidatePlannedActions = jest.fn();
const logError = jest.fn();

const strapi = {
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
});
