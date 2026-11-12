import { describe, test, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import createQueryParamService from '../query-params';

const models: Record<string, unknown> = {
  'api::article.article': {
    uid: 'api::article.article',
    modelType: 'contentType',
    kind: 'collectionType',
    info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' },
    attributes: {
      title: { type: 'string' },
      meta: { type: 'json' },
      seo: { type: 'component', component: 'shared.seo' },
    },
  },
  'shared.seo': {
    uid: 'shared.seo',
    modelType: 'component',
    attributes: {
      metaTitle: { type: 'string' },
    },
  },
};

const UID = 'api::article.article';

const createStrapi = (environment: string | undefined) => {
  const warn = vi.fn();

  const strapi = {
    config: {
      get: vi.fn((path: string) => (path === 'environment' ? environment : undefined)),
    },
    getModel: vi.fn((uid: string) => models[uid]),
    log: { warn },
  } as unknown as Core.Strapi;

  return { strapi, warn };
};

describe('query-params service', () => {
  describe('unknown filter key warning', () => {
    test('warns about an unknown filter key in development', () => {
      const { strapi, warn } = createStrapi('development');
      const queryParams = createQueryParamService(strapi);

      const query = queryParams.transform(UID, {
        filters: { title: { $eq: 'Hello' }, seo: { metaTitel: { $eq: 'a' } } },
      });

      expect(query.where).toEqual({ title: { $eq: 'Hello' } });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        '[strapi] Unknown filter key "metaTitel" at "seo.metaTitel" on model "shared.seo" was ignored: the query ran without this condition and may return more results than intended. Check for a typo. This will become an error in a future major version.'
      );
    });

    test('warns about an object operand on a scalar attribute in development', () => {
      const { strapi, warn } = createStrapi('development');
      const queryParams = createQueryParamService(strapi);

      const query = queryParams.transform(UID, {
        filters: { meta: { $eq: { a: 999 } } },
      });

      expect(query.where).toEqual({});
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        '[strapi] Unsupported object operand for "$eq" on "meta" (model "api::article.article") was ignored: the query ran without this condition and may return more results than intended. This will become an error in a future major version.'
      );
    });

    test('escapes control characters of filter keys in the warning', () => {
      const { strapi, warn } = createStrapi('development');
      const queryParams = createQueryParamService(strapi);
      const key = 'x"\n\u001b[31mred\u009b\u2028';

      queryParams.transform(UID, { filters: { [key]: 1 } });

      expect(warn).toHaveBeenCalledTimes(1);

      const message: string = warn.mock.calls[0][0];

      expect(message).toContain(
        'Unknown filter key "x\\"\\n\\u001b[31mred\\u009b\\u2028" at "x\\"\\n\\u001b[31mred\\u009b\\u2028"'
      );
      // eslint-disable-next-line no-control-regex
      expect(message).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/);
    });

    test('escapes control characters of object operand keys in the warning', () => {
      const { strapi, warn } = createStrapi('development');
      const queryParams = createQueryParamService(strapi);

      queryParams.transform(UID, { filters: { meta: { $eq: { 'a\nb': 1 } } } });

      expect(warn).toHaveBeenCalledTimes(1);

      const message: string = warn.mock.calls[0][0];

      expect(message).toContain('Unsupported object operand for "$eq" on "meta"');
      // eslint-disable-next-line no-control-regex
      expect(message).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/);
    });

    test.each([['production'], ['test'], [undefined]])(
      'does not warn when the environment is %s',
      (environment) => {
        const { strapi, warn } = createStrapi(environment);
        const queryParams = createQueryParamService(strapi);

        const query = queryParams.transform(UID, {
          filters: { titel: 'a', meta: { $eq: { a: 999 } } },
        });

        // The unknown keys are still removed, only the warning is development only
        expect(query.where).toEqual({});
        expect(warn).not.toHaveBeenCalled();
      }
    );

    test('reads the environment once, when the service is created', () => {
      const { strapi } = createStrapi('development');
      const queryParams = createQueryParamService(strapi);

      queryParams.transform(UID, { filters: { titel: 'a' } });
      queryParams.transform(UID, { filters: { titel: 'b' } });

      expect(strapi.config.get).toHaveBeenCalledTimes(1);
    });

    test('warns once per model and attribute path', () => {
      const { strapi, warn } = createStrapi('development');
      const queryParams = createQueryParamService(strapi);

      queryParams.transform(UID, { filters: { titel: 'a' } });
      queryParams.transform(UID, { filters: { titel: 'b' } });
      queryParams.transform(UID, { filters: { $or: [{ titel: 'c' }] } });
      queryParams.transform(UID, { filters: { seo: { titel: 'd' } } });

      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenNthCalledWith(1, expect.stringContaining('at "titel"'));
      expect(warn).toHaveBeenNthCalledWith(2, expect.stringContaining('at "seo.titel"'));
    });

    test('stops warning past 1000 distinct unknown filter keys', () => {
      const { strapi, warn } = createStrapi('development');
      const queryParams = createQueryParamService(strapi);

      for (let index = 0; index < 1001; index += 1) {
        queryParams.transform(UID, { filters: { [`unknown${index}`]: 'a' } });
      }

      expect(warn).toHaveBeenCalledTimes(1000);

      // Keys already warned about stay deduped
      queryParams.transform(UID, { filters: { unknown0: 'a' } });

      expect(warn).toHaveBeenCalledTimes(1000);
    });
  });
});
