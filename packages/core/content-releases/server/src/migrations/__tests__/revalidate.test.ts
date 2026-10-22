import type { Schema } from '@strapi/types';

import { revalidateChangedContentTypes } from '..';

type OldContentTypes = Parameters<typeof revalidateChangedContentTypes>[0]['oldContentTypes'];

const contentTypes = {
  'api::article.article': {
    uid: 'api::article.article',
    options: { draftAndPublish: true },
  } as unknown as Schema.ContentType,
};

describe('revalidateChangedContentTypes', () => {
  beforeEach(() => {
    global.strapi = { db: {} } as unknown as typeof global.strapi;
  });

  // The core store table exists but has no saved schemas, e.g. after a first start that failed
  // before saving them. Core then passes `null`, which the `Input` type does not declare.
  it('skips revalidation without saved schemas', async () => {
    await expect(
      revalidateChangedContentTypes({
        oldContentTypes: null as unknown as OldContentTypes,
        contentTypes,
      })
    ).resolves.toBeUndefined();
  });

  // The core store table does not exist yet: core passes `undefined`.
  it('skips revalidation before the core store table exists', async () => {
    await expect(
      revalidateChangedContentTypes({
        oldContentTypes: undefined as unknown as OldContentTypes,
        contentTypes,
      })
    ).resolves.toBeUndefined();
  });
});
