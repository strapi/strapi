import type { Core, Modules } from '@strapi/types';
import { errors } from '@strapi/utils';
import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';
import resources from '../resources/index';
import { ARTICLE_UID } from '../utils';

let strapi: Core.Strapi;

describe('Document Service Validations', () => {
  let testUtils;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  const methods = [
    'findMany',
    'findFirst',
    'findOne',
    'publish',
    'delete',
    'create',
    'unpublish',
    'clone',
    'update',
    'discardDraft',
    'count',
  ];

  // Helper to verify result has correct type and basic structure
  const expectValidResult = (result: any, methodName: string) => {
    expect(result).toBeDefined();

    switch (methodName) {
      case 'findMany':
        expect(Array.isArray(result)).toBe(true);
        // If results exist, verify they're objects (basic structure check)
        if (result.length > 0) {
          expect(typeof result[0]).toBe('object');
        }
        break;
      case 'findFirst':
      case 'findOne':
        expect(result === null || typeof result === 'object').toBe(true);
        break;
      case 'count':
        expect(typeof result).toBe('number');
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
        break;
      case 'create':
        expect(typeof result).toBe('object');
        expect(result).not.toBeNull();
        break;
      case 'update':
        expect(result === null || typeof result === 'object').toBe(true);
        break;
      case 'delete':
      case 'clone':
      case 'publish':
      case 'unpublish':
      case 'discardDraft':
        expect(typeof result).toBe('object');
        expect(result).toHaveProperty('documentId');
        expect(result).toHaveProperty('entries');
        expect(Array.isArray(result.entries)).toBe(true);
        break;
      default:
        expect(result).toBeDefined();
    }
  };

  describe.each(methods)('%s method', (methodName) => {
    describe('sort', () => {
      it('should not throw on existing attribute name', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({ sort: 'title' });
        expectValidResult(result, methodName);
      });

      it('should not throw on private attribute', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({ sort: 'private' });
        expectValidResult(result, methodName);
      });

      it('should not throw on password attribute', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({ sort: 'password' });
        expectValidResult(result, methodName);
      });

      it('should not throw on existing nested (object) key', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          populate: { categories: { sort: { name: 'asc' } } },
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on existing nested (dot separated) key', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          sort: 'categories.name',
          populate: 'categories',
        });
        expectValidResult(result, methodName);
      });

      it('should throw ValidationError on invalid key', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({ sort: 'fakekey' })
        ).rejects.toThrow(errors.ValidationError);
      });
    });

    describe('filters', () => {
      it('should not throw on existing attribute equality', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          filters: {
            title: 'Article1-Draft-EN',
          },
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on private attribute', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          filters: {
            private: 'private',
          },
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on password attribute', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          filters: {
            password: { $notNull: true },
          },
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on existing nested conditions', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          filters: {
            title: {
              $not: {
                $contains: 'Article',
              },
            },
          },
        });
        expectValidResult(result, methodName);
      });

      it('should throw ValidationError on invalid key', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({
            filters: {
              fakekey: 'Hello World',
            },
          })
        ).rejects.toThrow(errors.ValidationError);
      });
    });

    describe('fields', () => {
      it('should not throw on existing attribute equality', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          fields: ['title'],
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on private attribute', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          fields: ['private'],
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on password attribute', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          fields: ['password'],
        });
        expectValidResult(result, methodName);
      });

      it('should throw ValidationError on invalid key', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({
            fields: ['title', 'fakekey'],
          })
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should not throw on valid comma separated keys', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          fields: 'title,password,private',
        });
        expectValidResult(result, methodName);
      });

      it('should throw on invalid comma separated keys', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({ fields: 'title,invalid' })
        ).rejects.toThrow(errors.ValidationError);
      });
    });

    describe('populate', () => {
      it('should not throw on populatable attribute', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          populate: ['categories'],
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on private attribute', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          populate: ['categories_private'],
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on wildcard *', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          populate: '*',
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on dz (boolean)', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          populate: {
            identifiersDz: true,
          },
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on dz - comp (boolean)', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          populate: {
            identifiersDz: {
              on: {
                'article.compo-unique-all': true,
              },
            },
          },
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on dz', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          populate: {
            identifiersDz: {
              on: {
                'article.compo-unique-all': {
                  fields: ['ComponentTextShort'],
                },
              },
            },
          },
        });
        expectValidResult(result, methodName);
      });

      it('should not throw on nested wildcard populate', async () => {
        const result = await strapi.documents(ARTICLE_UID)[methodName]({
          populate: {
            identifiersDz: {
              on: {
                'article.compo-unique-all': {
                  populate: '*',
                },
              },
            },
          },
        });
        expectValidResult(result, methodName);
      });

      // TODO: functionality is not yet implemented
      it('should throw ValidationError on invalid dz component', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({
            populate: {
              identifiersDz: {
                on: {
                  invalidkey: true,
                },
              },
            },
          })
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should throw ValidationError on non-populatable attribute', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({
            populate: ['title'],
          })
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should throw ValidationError on invalid key', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({
            populate: ['categories', 'fakekey'],
          })
        ).rejects.toThrow(errors.ValidationError);
      });
    });

    /**
     * Lookup is an internal parameter used to filter by locale and status.
     * It should not be exposed to the public API.
     */
    describe('lookup', () => {
      it('should throw ValidationError', async () => {
        await expect(
          strapi.documents(ARTICLE_UID)[methodName]({
            lookup: {
              title: 'Hello World',
            },
          })
        ).rejects.toThrow(errors.ValidationError);
      });
    });
  });

  describe('Status validation', () => {
    describe('findMany method', () => {
      it('should accept valid status "published"', async () => {
        const result = await strapi.documents(ARTICLE_UID).findMany({ status: 'published' });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should accept valid status "draft"', async () => {
        const result = await strapi.documents(ARTICLE_UID).findMany({ status: 'draft' });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should pass through invalid status in default mode', async () => {
        // Should not throw - invalid params are passed through unchanged in default mode
        const result = await strapi.documents(ARTICLE_UID).findMany({ status: 'invalid' } as any);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should pass through non-string status in default mode', async () => {
        // Should not throw - invalid params are passed through unchanged in default mode
        const result = await strapi.documents(ARTICLE_UID).findMany({ status: 123 } as any);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Locale validation', () => {
    describe('findMany method', () => {
      it('should accept valid string locale', async () => {
        const result = await strapi.documents(ARTICLE_UID).findMany({ locale: 'en' });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should accept wildcard locale', async () => {
        const result = await strapi.documents(ARTICLE_UID).findMany({ locale: '*' });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should accept valid BCP 47 locale formats', async () => {
        const validLocales = ['en', 'nl', 'en-US', 'ar-DZ', 'zh-Hans', 'pt-BR'];
        for (const locale of validLocales) {
          const result = await strapi.documents(ARTICLE_UID).findMany({ locale });
          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
        }
      });

      it('should accept locale with any case for language part (BCP 47 is case-insensitive)', async () => {
        const anyCaseLocales = ['EN', 'En', 'EN-US', 'en-us'];
        for (const locale of anyCaseLocales) {
          const result = await strapi.documents(ARTICLE_UID).findMany({ locale });
          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
        }
      });

      it('should pass through non-string locale in default mode', async () => {
        // Should not throw - invalid params are passed through unchanged in default mode
        const result = await strapi.documents(ARTICLE_UID).findMany({ locale: 123 } as any);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Pagination validation', () => {
    describe('Page-based pagination', () => {
      it('should accept valid page and pageSize', async () => {
        const result = await strapi.documents(ARTICLE_UID).findMany({ page: 1, pageSize: 10 });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should throw PaginationError for invalid page (non-integer) in default mode', async () => {
        // Even in default mode, downstream query transformation validates pagination
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ page: 'invalid', pageSize: 10 } as any)
        ).rejects.toThrow("Invalid 'page' parameter");
      });

      it('should throw PaginationError for invalid page (less than 1) in default mode', async () => {
        // Even in default mode, downstream query transformation validates pagination
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ page: 0, pageSize: 10 })
        ).rejects.toThrow("Invalid 'page' parameter");
      });

      it('should throw PaginationError for invalid pageSize (non-integer) in default mode', async () => {
        // Even in default mode, downstream query transformation validates pagination
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ page: 1, pageSize: 'invalid' } as any)
        ).rejects.toThrow("Invalid 'pageSize' parameter");
      });

      it('should throw PaginationError for invalid pageSize (less than 1) in default mode', async () => {
        // Even in default mode, downstream query transformation validates pagination
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ page: 1, pageSize: 0 })
        ).rejects.toThrow("Invalid 'pageSize' parameter");
      });

      it('should pass through string numbers in default mode', async () => {
        // Should not throw - invalid params are passed through unchanged in default mode
        const result = await strapi.documents(ARTICLE_UID).findMany({
          page: '2',
          pageSize: '20',
        } as any);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('Offset-based pagination', () => {
      it('should accept valid start and limit', async () => {
        const result = await strapi.documents(ARTICLE_UID).findMany({ start: 0, limit: 10 });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should accept limit of -1 (unlimited)', async () => {
        const result = await strapi.documents(ARTICLE_UID).findMany({ start: 0, limit: -1 });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should throw Error for invalid start (non-integer) in default mode', async () => {
        // Even in default mode, downstream query transformation validates pagination
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ start: 'invalid', limit: 10 } as any)
        ).rejects.toThrow('convertStartQueryParams expected a positive integer');
      });

      it('should throw Error for invalid start (negative) in default mode', async () => {
        // Even in default mode, downstream query transformation validates pagination
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ start: -1, limit: 10 })
        ).rejects.toThrow('convertStartQueryParams expected a positive integer');
      });

      it('should throw Error for invalid limit (non-integer) in default mode', async () => {
        // Even in default mode, downstream query transformation validates pagination
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ start: 0, limit: 'invalid' } as any)
        ).rejects.toThrow('convertLimitQueryParams expected a positive integer');
      });

      it('should accept limit 0 in default mode (treated as valid by downstream)', async () => {
        // Note: limit: 0 is actually accepted by convertLimitQueryParams (0 is not < 0)
        // The database handles limit: 0 in its own way (likely as no limit or all results)
        // This test verifies that our validation doesn't interfere with this behavior
        const result = await strapi.documents(ARTICLE_UID).findMany({ start: 0, limit: 0 });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('Mixed pagination types', () => {
      it('should throw PaginationError for mixed pagination in default mode', async () => {
        // Even in default mode, downstream query transformation validates pagination
        // and throws PaginationError for mixed pagination types
        await expect(
          strapi.documents(ARTICLE_UID).findMany({
            page: 1,
            pageSize: 10,
            start: 0,
            limit: 20,
          } as any)
        ).rejects.toThrow('Invalid pagination attributes');
      });
    });

    describe('withCount parameter', () => {
      it('should accept valid boolean withCount', async () => {
        const result = await strapi.documents(ARTICLE_UID).findMany({
          page: 1,
          pageSize: 10,
          withCount: true,
        });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should pass through non-boolean withCount in default mode', async () => {
        // Should not throw - invalid params are passed through unchanged in default mode
        const result = await strapi.documents(ARTICLE_UID).findMany({
          page: 1,
          pageSize: 10,
          withCount: 'true',
        } as any);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('strictParams: true (validate)', () => {
    beforeEach(() => {
      strapi.config.set('api.documents.strictParams', true);
    });

    afterAll(() => {
      strapi.config.set('api.documents.strictParams', undefined);
    });

    describe('Status', () => {
      it('should throw ValidationError for invalid status', async () => {
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ status: 'invalid' } as any)
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should throw ValidationError for non-string status', async () => {
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ status: 123 } as any)
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should treat null and empty string status as undefined (no status)', async () => {
        const resultNull = await strapi.documents(ARTICLE_UID).findMany({ status: null } as any);
        expect(resultNull).toBeDefined();
        expect(Array.isArray(resultNull)).toBe(true);

        const resultEmpty = await strapi.documents(ARTICLE_UID).findMany({ status: '' } as any);
        expect(resultEmpty).toBeDefined();
        expect(Array.isArray(resultEmpty)).toBe(true);

        const resultNoStatus = await strapi.documents(ARTICLE_UID).findMany({});
        expect(resultNull).toEqual(resultNoStatus);
        expect(resultEmpty).toEqual(resultNoStatus);
      });

      it('should accept false to explicitly disable validation', async () => {
        strapi.config.set('api.documents.strictParams', false);
        const result = await strapi.documents(ARTICLE_UID).findMany({ status: 'invalid' } as any);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        strapi.config.set('api.documents.strictParams', undefined);
      });
    });

    describe('Locale', () => {
      it('should throw ValidationError for non-string locale', async () => {
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ locale: 123 } as any)
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should accept valid BCP 47 locale and wildcard', async () => {
        const resultStar = await strapi.documents(ARTICLE_UID).findMany({ locale: '*' });
        expect(resultStar).toBeDefined();
        expect(Array.isArray(resultStar)).toBe(true);

        const resultEn = await strapi.documents(ARTICLE_UID).findMany({ locale: 'en' });
        expect(resultEn).toBeDefined();
        expect(Array.isArray(resultEn)).toBe(true);

        const resultEnUs = await strapi.documents(ARTICLE_UID).findMany({ locale: 'en-US' });
        expect(resultEnUs).toBeDefined();
        expect(Array.isArray(resultEnUs)).toBe(true);

        const resultEnUppercase = await strapi.documents(ARTICLE_UID).findMany({ locale: 'EN' });
        expect(resultEnUppercase).toBeDefined();
        expect(Array.isArray(resultEnUppercase)).toBe(true);
      });

      it('should treat empty locale as undefined', async () => {
        const result = await strapi.documents(ARTICLE_UID).findMany({ locale: '' });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        // Empty locale is normalized to undefined, so result should match findMany without locale
        const resultNoLocale = await strapi.documents(ARTICLE_UID).findMany({});
        expect(result).toEqual(resultNoLocale);
      });

      it('should throw ValidationError for invalid locale format (underscore)', async () => {
        await expect(strapi.documents(ARTICLE_UID).findMany({ locale: 'en_US' })).rejects.toThrow(
          errors.ValidationError
        );
        await expect(strapi.documents(ARTICLE_UID).findMany({ locale: 'en_US' })).rejects.toThrow(
          /BCP 47/
        );
      });

      it('should throw ValidationError for invalid locale format (single character)', async () => {
        await expect(strapi.documents(ARTICLE_UID).findMany({ locale: 'x' })).rejects.toThrow(
          errors.ValidationError
        );
      });

      it('should throw ValidationError for invalid locale format (invalid characters)', async () => {
        await expect(strapi.documents(ARTICLE_UID).findMany({ locale: 'en-US!' })).rejects.toThrow(
          errors.ValidationError
        );
      });

      it('should throw ValidationError for locale exceeding max length', async () => {
        const longLocale = 'en-' + 'x'.repeat(35);
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ locale: longLocale })
        ).rejects.toThrow(errors.ValidationError);
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ locale: longLocale })
        ).rejects.toThrow(/maximum length/);
      });
    });

    describe('Pagination', () => {
      it('should throw ValidationError for invalid page', async () => {
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ page: 0, pageSize: 10 })
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should throw ValidationError for invalid pageSize', async () => {
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ page: 1, pageSize: 0 })
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should throw ValidationError for invalid start', async () => {
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ start: -1, limit: 10 })
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should throw ValidationError for invalid limit', async () => {
        await expect(
          strapi.documents(ARTICLE_UID).findMany({ start: 0, limit: 0 })
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should throw ValidationError for mixed pagination', async () => {
        await expect(
          strapi.documents(ARTICLE_UID).findMany({
            page: 1,
            pageSize: 10,
            start: 0,
            limit: 20,
          } as any)
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should treat null and empty string pagination params as absent', async () => {
        const resultPageNull = await strapi.documents(ARTICLE_UID).findMany({
          page: null,
          pageSize: 10,
        } as any);
        expect(resultPageNull).toBeDefined();
        expect(Array.isArray(resultPageNull)).toBe(true);

        const resultPageEmpty = await strapi.documents(ARTICLE_UID).findMany({
          page: 1,
          pageSize: '',
        } as any);
        expect(resultPageEmpty).toBeDefined();
        expect(Array.isArray(resultPageEmpty)).toBe(true);

        const resultStartNull = await strapi.documents(ARTICLE_UID).findMany({
          start: null,
          limit: 10,
        } as any);
        expect(resultStartNull).toBeDefined();
        expect(Array.isArray(resultStartNull)).toBe(true);
      });

      it('should treat null and empty string withCount as absent', async () => {
        const resultNull = await strapi.documents(ARTICLE_UID).findMany({
          page: 1,
          pageSize: 10,
          withCount: null,
        } as any);
        expect(resultNull).toBeDefined();
        expect(Array.isArray(resultNull)).toBe(true);

        const resultEmpty = await strapi.documents(ARTICLE_UID).findMany({
          page: 1,
          pageSize: 10,
          withCount: '',
        } as any);
        expect(resultEmpty).toBeDefined();
        expect(Array.isArray(resultEmpty)).toBe(true);
      });

      it('should accept withCount string "true" and "false" when strict (coerced from query params)', async () => {
        const resultTrue = await strapi.documents(ARTICLE_UID).findMany({
          page: 1,
          pageSize: 10,
          withCount: 'true',
        } as any);
        expect(resultTrue).toBeDefined();
        expect(Array.isArray(resultTrue)).toBe(true);

        const resultFalse = await strapi.documents(ARTICLE_UID).findMany({
          page: 1,
          pageSize: 10,
          withCount: 'false',
        } as any);
        expect(resultFalse).toBeDefined();
        expect(Array.isArray(resultFalse)).toBe(true);
      });

      it('should throw ValidationError for invalid withCount (e.g. number or non-boolean string)', async () => {
        await expect(
          strapi.documents(ARTICLE_UID).findMany({
            page: 1,
            pageSize: 10,
            withCount: 123,
          } as any)
        ).rejects.toThrow(errors.ValidationError);
        await expect(
          strapi.documents(ARTICLE_UID).findMany({
            page: 1,
            pageSize: 10,
            withCount: 'yes',
          } as any)
        ).rejects.toThrow(errors.ValidationError);
      });
    });
  });

  describe('Unrecognized root-level params (api.documents.strictParams)', () => {
    describe('strictParams: true', () => {
      afterEach(() => {
        strapi.config.set('api.documents.strictParams', undefined);
      });

      it('should throw ValidationError when unrecognized root-level key is passed', async () => {
        strapi.config.set('api.documents.strictParams', true);

        await expect(
          strapi.documents(ARTICLE_UID).findMany({ where: { id: 1 } } as any)
        ).rejects.toThrow(errors.ValidationError);

        await expect(
          strapi.documents(ARTICLE_UID).findMany({ where: { id: 1 } } as any)
        ).rejects.toThrow(/Unrecognized parameter\(s\) at root level/);
      });

      it('should throw ValidationError for multiple unrecognized root-level keys', async () => {
        strapi.config.set('api.documents.strictParams', true);

        await expect(
          strapi.documents(ARTICLE_UID).findMany({ foo: 'bar', baz: 123 } as any)
        ).rejects.toThrow(errors.ValidationError);

        await expect(
          strapi.documents(ARTICLE_UID).findMany({ foo: 'bar', baz: 123 } as any)
        ).rejects.toThrow(/Unrecognized parameter\(s\) at root level/);
      });

      it('should accept only allowed root-level params', async () => {
        strapi.config.set('api.documents.strictParams', true);

        const result = await strapi.documents(ARTICLE_UID).findMany({
          status: 'published',
          locale: 'en',
          filters: { title: { $containsi: 'Article' } },
        });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should accept allowed params including hasPublishedVersion and reject extra unrecognized keys', async () => {
        strapi.config.set('api.documents.strictParams', true);

        const result = await strapi.documents(ARTICLE_UID).findMany({
          status: 'draft',
          hasPublishedVersion: false,
        });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        await expect(
          strapi.documents(ARTICLE_UID).findMany({
            status: 'draft',
            hasPublishedVersion: false,
            unrecognizedKey: 'value',
          } as any)
        ).rejects.toThrow(errors.ValidationError);
      });

      it('should accept create with data param when strictParams is true', async () => {
        strapi.config.set('api.documents.strictParams', true);

        const doc = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'StrictParams create test' },
        });
        expect(doc).toBeDefined();
        expect(doc).toHaveProperty('documentId');
        expect(doc).toMatchObject({ title: 'StrictParams create test' });
      });

      it('should accept update with data param when strictParams is true', async () => {
        strapi.config.set('api.documents.strictParams', true);

        const created = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Original' },
        });
        const updated = await strapi.documents(ARTICLE_UID).update({
          documentId: created.documentId,
          data: { title: 'Updated under strictParams' },
        });
        expect(updated).toBeDefined();
        expect(updated).toMatchObject({ title: 'Updated under strictParams' });
      });
    });

    describe('strictParams: false / undefined (default)', () => {
      it('should pass through unrecognized root-level keys without throwing', async () => {
        strapi.config.set('api.documents.strictParams', false);
        const result = await strapi.documents(ARTICLE_UID).findMany({
          status: 'published',
          unknownParam: { nested: 1 },
        } as any);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        strapi.config.set('api.documents.strictParams', undefined);
      });

      it('should not apply unrecognized root-level keys to the query', async () => {
        strapi.config.set('api.documents.strictParams', false);

        const withKnownParamsOnly = await strapi.documents(ARTICLE_UID).findMany({
          status: 'published',
        });
        const withUnknownKey = await strapi.documents(ARTICLE_UID).findMany({
          status: 'published',
          unrecognizedKey: { restrict: 'value' },
        } as any);

        expect(withKnownParamsOnly.length).toBe(withUnknownKey.length);
        const idsOnly = (arr: any[]) => arr.map((d) => d.documentId).sort();
        expect(idsOnly(withUnknownKey)).toEqual(idsOnly(withKnownParamsOnly));

        strapi.config.set('api.documents.strictParams', undefined);
      });
    });
  });

  describe('strictParams config validation', () => {
    it('should throw ValidationError for non-boolean strictParams value', async () => {
      strapi.config.set('api.documents.strictParams', 'invalid' as any);

      await expect(strapi.documents(ARTICLE_UID).findMany({})).rejects.toThrow(
        errors.ValidationError
      );
      await expect(strapi.documents(ARTICLE_UID).findMany({})).rejects.toThrow(
        /Invalid config\.api\.documents\.strictParams value/
      );

      strapi.config.set('api.documents.strictParams', undefined);
    });

    it('should accept valid strictParams values (boolean or undefined)', async () => {
      const validValues = [undefined, false, true];

      for (const value of validValues) {
        strapi.config.set('api.documents.strictParams', value as any);

        // Should not throw when using a valid value
        await expect(strapi.documents(ARTICLE_UID).findMany({})).resolves.not.toThrow();
      }

      strapi.config.set('api.documents.strictParams', undefined);
    });
  });
});
