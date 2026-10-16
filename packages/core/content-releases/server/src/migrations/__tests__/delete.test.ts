import type { Core, Schema } from '@strapi/types';

import { deleteActionsOnDeleteContentType, deleteActionsOnDisableDraftAndPublish } from '..';

const deleteContentTypeActions = jest.fn();

const strapi = {
  plugin: () => ({ service: () => ({ deleteContentTypeActions }) }),
} as unknown as Core.Strapi;

const contentType = (draftAndPublish: boolean) =>
  ({ options: { draftAndPublish }, attributes: {} }) as unknown as Schema.ContentType;

describe('content type removals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes the actions of the content types that lost Draft and Publish', async () => {
    await deleteActionsOnDisableDraftAndPublish(
      {
        oldContentTypes: {
          'api::disabled.disabled': contentType(true),
          'api::kept.kept': contentType(true),
          'api::never.never': contentType(false),
        },
        contentTypes: {
          'api::disabled.disabled': contentType(false),
          'api::kept.kept': contentType(true),
          'api::never.never': contentType(false),
          // New: it had no actions
          'api::new.new': contentType(false),
        },
      },
      { strapi }
    );

    expect(deleteContentTypeActions.mock.calls).toStrictEqual([[['api::disabled.disabled']]]);
  });

  it('removes the actions of the deleted content types', async () => {
    await deleteActionsOnDeleteContentType(
      {
        oldContentTypes: {
          'api::deleted.deleted': contentType(true),
          'api::kept.kept': contentType(true),
        },
        contentTypes: { 'api::kept.kept': contentType(true) },
      },
      { strapi }
    );

    expect(deleteContentTypeActions.mock.calls).toStrictEqual([[['api::deleted.deleted']]]);
  });

  it('does nothing when no content type was deleted or lost Draft and Publish', async () => {
    const unchanged = { 'api::kept.kept': contentType(true) };

    await deleteActionsOnDisableDraftAndPublish(
      { oldContentTypes: unchanged, contentTypes: unchanged },
      { strapi }
    );
    await deleteActionsOnDeleteContentType(
      { oldContentTypes: unchanged, contentTypes: unchanged },
      { strapi }
    );

    expect(deleteContentTypeActions).not.toHaveBeenCalled();
  });
});
