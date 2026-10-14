import type { Schema } from '@strapi/types';

import { revalidateChangedContentTypes } from '..';

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
  // before saving them.
  it('skips revalidation without saved schemas', async () => {
    await expect(
      revalidateChangedContentTypes({ oldContentTypes: null, contentTypes })
    ).resolves.toBeUndefined();
  });

  // The core store table does not exist yet: core passes `undefined`.
  it('skips revalidation before the core store table exists', async () => {
    await expect(
      revalidateChangedContentTypes({ oldContentTypes: undefined, contentTypes })
    ).resolves.toBeUndefined();
  });
});
