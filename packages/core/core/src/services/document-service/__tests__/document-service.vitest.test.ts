import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { Core, UID } from '@strapi/types';

import { createDocumentService } from '..';

describe('createDocumentService', () => {
  describe('without a global Strapi', () => {
    const globalWithStrapi = global as unknown as { strapi?: unknown };
    const uid: UID.ContentType = 'api::article.article';
    let previousStrapi: unknown;

    beforeEach(() => {
      previousStrapi = globalWithStrapi.strapi;
    });

    afterEach(() => {
      globalWithStrapi.strapi = previousStrapi;
    });

    test('says Strapi is not available when a repository is created after destroy', () => {
      // destroy() deletes global.strapi; the instance passed to the factory stays reachable
      const strapi = {
        contentType: () => ({ uid, kind: 'collectionType', attributes: {} }),
      } as unknown as Core.Strapi;
      const documents = createDocumentService(strapi);
      delete globalWithStrapi.strapi;

      const getRepository = () => documents(uid);

      expect(getRepository).toThrow(
        new Error(
          "Cannot run strapi.documents('api::article.article'): Strapi is not available " +
            '(it was destroyed or never created). The document service needs a loaded Strapi instance.'
        )
      );
      expect(getRepository).toThrow(expect.objectContaining({ cause: expect.any(ReferenceError) }));
    });

    test('says Strapi is not available when it was never created', () => {
      delete globalWithStrapi.strapi;
      const strapi = {
        contentType: () => ({ uid, kind: 'collectionType', attributes: {} }),
      } as unknown as Core.Strapi;
      const documents = createDocumentService(strapi);

      expect(() => documents(uid)).toThrow(
        new Error(
          "Cannot run strapi.documents('api::article.article'): Strapi is not available " +
            '(it was destroyed or never created). The document service needs a loaded Strapi instance.'
        )
      );
    });
  });
});
