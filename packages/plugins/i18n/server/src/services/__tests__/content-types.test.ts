import { errors } from '@strapi/utils';
import contentTypesServiceFactory from '../content-types';

const {
  isLocalizedContentType,
  getValidLocale,
  getNonLocalizedAttributes,
  copyNonLocalizedAttributes,
  fillNonLocalizedAttributes,
  getNestedPopulateOfNonLocalizedAttributes,
} = contentTypesServiceFactory();

const { ApplicationError } = errors;

describe('content-types service', () => {
  describe('isLocalizedContentType', () => {
    test('Checks for the i18N option', () => {
      expect(isLocalizedContentType({ pluginOptions: { i18n: { localized: false } } })).toBe(false);
      expect(isLocalizedContentType({ pluginOptions: { i18n: { localized: true } } })).toBe(true);
    });

    test('Defaults to false', () => {
      expect(isLocalizedContentType({})).toBe(false);
      expect(isLocalizedContentType({ pluginOptions: {} })).toBe(false);
      expect(isLocalizedContentType({ pluginOptions: { i18n: {} } })).toBe(false);
    });
  });

  describe('getNonLocalizedAttributes', () => {
    test('Uses the pluginOptions to detect non localized fields', () => {
      expect(
        getNonLocalizedAttributes({
          uid: 'test-model',
          attributes: {
            title: {
              type: 'string',
              pluginOptions: {
                i18n: {
                  localized: true,
                },
              },
            },
            stars: {
              type: 'integer',
            },
            price: {
              type: 'integer',
            },
          },
        })
      ).toEqual(['stars', 'price']);
    });

    test('Consider relations to be always localized', () => {
      expect(
        getNonLocalizedAttributes({
          uid: 'test-model',
          attributes: {
            title: {
              type: 'string',
              pluginOptions: {
                i18n: {
                  localized: true,
                },
              },
            },
            stars: {
              type: 'integer',
            },
            price: {
              type: 'integer',
            },
            relation: {
              type: 'relation',
              relation: 'oneToOne',
              target: 'user',
            },
            secondRelation: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'user',
            },
          },
        })
      ).toEqual(['stars', 'price']);
    });

    test('Consider locale, localizations & publishedAt as localized', () => {
      expect(
        getNonLocalizedAttributes({
          uid: 'test-model',
          attributes: {
            title: {
              type: 'string',
              pluginOptions: {
                i18n: {
                  localized: true,
                },
              },
            },
            stars: {
              type: 'integer',
            },
            price: {
              type: 'integer',
            },
            locale: {
              type: 'string',
              visible: false,
            },
            localizations: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'test-model',
              visible: false,
            },
            publishedAt: {
              type: 'datetime',
              visible: false,
            },
          },
        })
      ).toEqual(['stars', 'price']);
    });

    test('Consider uid to always be localized', () => {
      expect(
        getNonLocalizedAttributes({
          attributes: {
            price: {
              type: 'integer',
            },
            slug: {
              type: 'uid',
            },
          },
        })
      ).toEqual(['price']);
    });
  });

  describe('getValidLocale', () => {
    test('set default locale if the provided one is nil', async () => {
      const getDefaultLocale = jest.fn(() => Promise.resolve('en'));
      global.strapi = {
        plugins: {
          i18n: {
            services: {
              locales: {
                getDefaultLocale,
              },
            },
          },
        },
      } as any;
      const locale = await getValidLocale(null);

      expect(locale).toBe('en');
    });

    test('set locale to the provided one if it exists', async () => {
      const findByCode = jest.fn(() => Promise.resolve('en'));
      global.strapi = {
        plugins: {
          i18n: {
            services: {
              locales: {
                findByCode,
              },
            },
          },
        },
      } as any;
      const locale = await getValidLocale('en');

      expect(locale).toBe('en');
    });

    test("throw if provided locale doesn't exist", async () => {
      const findByCode = jest.fn(() => Promise.resolve(undefined));
      global.strapi = {
        plugins: {
          i18n: {
            services: {
              locales: {
                findByCode,
              },
            },
          },
        },
      } as any;
      try {
        await getValidLocale('en');
      } catch (e: any) {
        expect(e instanceof ApplicationError).toBe(true);
        expect(e.message).toBe('Locale not found');
      }

      expect(findByCode).toHaveBeenCalledWith('en');
      expect.assertions(3);
    });
  });

  describe('copyNonLocalizedAttributes', () => {
    test('Does not copy locale, localizations & publishedAt', () => {
      const model = {
        attributes: {
          title: {
            type: 'string',
            pluginOptions: {
              i18n: { localized: true },
            },
          },
          price: {
            type: 'integer',
          },
          relation: {
            type: 'relation',
          },
          description: {
            type: 'string',
          },
          locale: {
            type: 'string',
            visible: false,
          },
          localizations: {
            collection: 'test-model',
            visible: false,
          },
          publishedAt: {
            type: 'datetime',
            visible: false,
          },
        },
      };

      const input = {
        id: 1,
        title: 'My custom title',
        price: 25,
        relation: 1,
        description: 'My super description',
        locale: 'en',
        localizations: [1, 2, 3],
        publishedAt: '2021-03-18T09:47:37.557Z',
      };

      const result = copyNonLocalizedAttributes(model, input);
      expect(result).toStrictEqual({
        price: input.price,
        description: input.description,
      });
    });

    test('picks only non localized attributes', () => {
      const model = {
        attributes: {
          title: {
            type: 'string',
            pluginOptions: {
              i18n: { localized: true },
            },
          },
          price: {
            type: 'integer',
          },
          relation: {
            type: 'relation',
          },
          description: {
            type: 'string',
          },
        },
      };

      const input = {
        id: 1,
        title: 'My custom title',
        price: 25,
        relation: 1,
        description: 'My super description',
      };

      const result = copyNonLocalizedAttributes(model, input);
      expect(result).toStrictEqual({
        price: input.price,
        description: input.description,
      });
    });

    test('Removes ids', () => {
      const compoModel = {
        attributes: {
          name: { type: 'string' },
        },
      };

      global.strapi = {
        components: {
          compo: compoModel,
        },
      } as any;

      const model = {
        attributes: {
          title: {
            type: 'string',
            pluginOptions: {
              i18n: { localized: true },
            },
          },
          price: {
            type: 'integer',
          },
          relation: {
            type: 'relation',
          },
          component: {
            type: 'component',
            component: 'compo',
          },
        },
      };

      const input = {
        id: 1,
        title: 'My custom title',
        price: 25,
        relation: 1,
        component: {
          id: 2,
          name: 'Hello',
        },
      };

      const result = copyNonLocalizedAttributes(model, input);
      expect(result).toEqual({
        price: 25,
        component: {
          name: 'Hello',
        },
      });
    });
  });

  describe('fillNonLocalizedAttributes', () => {
    test('fill non localized attributes', () => {
      const entry = {
        a: 'a',
        b: undefined,
        c: null,
        d: 1,
        e: {},
        la: 'a',
        lb: undefined,
        lc: null,
        ld: 1,
        le: {},
      };

      const relatedEntry = {
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
        e: 'e',
        la: 'la',
        lb: 'lb',
        lc: 'lc',
        ld: 'ld',
        le: 'le',
      };

      const modelDef = {
        attributes: {
          a: {},
          b: {},
          c: {},
          d: {},
          e: {},
          la: { pluginOptions: { i18n: { localized: true } } },
          lb: { pluginOptions: { i18n: { localized: true } } },
          lc: { pluginOptions: { i18n: { localized: true } } },
          ld: { pluginOptions: { i18n: { localized: true } } },
          le: { pluginOptions: { i18n: { localized: true } } },
        },
      };

      const getModel = jest.fn(() => modelDef);
      global.strapi = { getModel } as any;

      fillNonLocalizedAttributes(entry, relatedEntry, { model: 'model' });

      expect(entry).toEqual({
        a: 'a',
        b: 'b',
        c: 'c',
        d: 1,
        e: {},
        la: 'a',
        lb: undefined,
        lc: null,
        ld: 1,
        le: {},
      });
    });

    it('fills empty arrays from the related entry (admin create-locale defaults)', () => {
      const entry = {
        name: 'fr',
        variants: [],
      };
      const relatedEntry = {
        name: 'en',
        variants: [{ name: 'keep-me' }],
      };
      const componentModel = {
        attributes: {
          name: { type: 'string' },
        },
      };
      const modelDef = {
        attributes: {
          name: { pluginOptions: { i18n: { localized: true } } },
          variants: {
            type: 'component',
            component: 'default.variant',
            repeatable: true,
            pluginOptions: { i18n: { localized: false } },
          },
        },
      };

      const getModel = jest.fn(() => modelDef);
      global.strapi = {
        getModel,
        components: { 'default.variant': componentModel },
      } as any;

      fillNonLocalizedAttributes(entry, relatedEntry, { model: 'model' });

      expect(entry.variants).toEqual([{ name: 'keep-me' }]);
      expect(entry.name).toBe('fr');
    });

    it('deep-fills nested components when the parent component is present but nested keys are unset', () => {
      const innerModel = {
        attributes: {
          label: { type: 'string' },
        },
      };
      const midModel = {
        attributes: {
          heading: { type: 'string' },
          inners: {
            type: 'component',
            component: 'default.inner',
            repeatable: true,
          },
        },
      };
      const outerModel = {
        attributes: {
          name: { type: 'string' },
          mid: {
            type: 'component',
            component: 'default.mid',
            repeatable: false,
          },
        },
      };
      const modelDef = {
        attributes: {
          title: { pluginOptions: { i18n: { localized: true } } },
          profile: {
            type: 'component',
            component: 'default.outer',
            repeatable: false,
            pluginOptions: { i18n: { localized: false } },
          },
        },
      };

      const getModel = jest.fn(
        (uid: string) =>
          ({
            model: modelDef,
            'default.outer': outerModel,
            'default.mid': midModel,
            'default.inner': innerModel,
          })[uid]
      );
      global.strapi = {
        getModel,
        components: {
          'default.outer': outerModel,
          'default.mid': midModel,
          'default.inner': innerModel,
        },
      } as any;

      const entry = {
        title: 'fr',
        profile: { name: 'shared-name' },
      };
      const relatedEntry = {
        title: 'en',
        profile: {
          name: 'shared-name',
          mid: { heading: 'keep-heading', inners: [{ label: 'keep-inner' }] },
        },
      };

      fillNonLocalizedAttributes(entry, relatedEntry, { model: 'model' });

      expect(entry.profile).toEqual({
        name: 'shared-name',
        mid: { heading: 'keep-heading', inners: [{ label: 'keep-inner' }] },
      });
      expect(entry.title).toBe('fr');
    });

    it('deep-fills nested empty arrays inside a present non-localized component', () => {
      const innerModel = {
        attributes: {
          label: { type: 'string' },
        },
      };
      const outerModel = {
        attributes: {
          name: { type: 'string' },
          inners: {
            type: 'component',
            component: 'default.inner',
            repeatable: true,
          },
        },
      };
      const modelDef = {
        attributes: {
          profile: {
            type: 'component',
            component: 'default.outer',
            repeatable: false,
            pluginOptions: { i18n: { localized: false } },
          },
        },
      };

      global.strapi = {
        getModel: (uid: string) =>
          ({
            model: modelDef,
            'default.outer': outerModel,
            'default.inner': innerModel,
          })[uid],
        components: {
          'default.outer': outerModel,
          'default.inner': innerModel,
        },
      } as any;

      const entry = {
        profile: { name: 'shared-name', inners: [] },
      };
      const relatedEntry = {
        profile: {
          name: 'shared-name',
          inners: [{ label: 'keep-inner' }],
        },
      };

      fillNonLocalizedAttributes(entry, relatedEntry, { model: 'model' });

      expect(entry.profile.inners).toEqual([{ label: 'keep-inner' }]);
    });

    it('fills empty dynamic zones from the related entry', () => {
      const componentModel = {
        attributes: {
          name: { type: 'string' },
        },
      };
      const modelDef = {
        attributes: {
          title: { pluginOptions: { i18n: { localized: true } } },
          blocks: {
            type: 'dynamiczone',
            components: ['default.compo'],
            pluginOptions: { i18n: { localized: false } },
          },
        },
      };

      global.strapi = {
        getModel: jest.fn(() => modelDef),
        components: { 'default.compo': componentModel },
      } as any;

      const entry = {
        title: 'fr',
        blocks: [],
      };
      const relatedEntry = {
        title: 'en',
        blocks: [{ __component: 'default.compo', name: 'hero' }],
      };

      fillNonLocalizedAttributes(entry, relatedEntry, { model: 'model' });

      expect(entry.blocks).toEqual([{ __component: 'default.compo', name: 'hero' }]);
      expect(entry.title).toBe('fr');
    });

    it('deep-fills matching items in a non-empty repeatable component', () => {
      const innerModel = {
        attributes: {
          label: { type: 'string' },
        },
      };
      const outerModel = {
        attributes: {
          name: { type: 'string' },
          inners: {
            type: 'component',
            component: 'default.inner',
            repeatable: true,
          },
        },
      };
      const modelDef = {
        attributes: {
          profiles: {
            type: 'component',
            component: 'default.outer',
            repeatable: true,
            pluginOptions: { i18n: { localized: false } },
          },
        },
      };

      global.strapi = {
        getModel: (uid: string) =>
          ({
            model: modelDef,
            'default.outer': outerModel,
            'default.inner': innerModel,
          })[uid],
        components: {
          'default.outer': outerModel,
          'default.inner': innerModel,
        },
      } as any;

      const entry = {
        profiles: [{ name: 'keep-parent', inners: [] }],
      };
      const relatedEntry = {
        profiles: [
          { name: 'old-parent', inners: [{ label: 'keep-inner' }] },
          { name: 'intentionally-removed', inners: [{ label: 'do-not-restore' }] },
        ],
      };

      fillNonLocalizedAttributes(entry, relatedEntry, { model: 'model' });

      expect(entry.profiles).toEqual([{ name: 'keep-parent', inners: [{ label: 'keep-inner' }] }]);
    });

    it('deep-fills matching component types in a non-empty dynamic zone', () => {
      const innerModel = {
        attributes: {
          label: { type: 'string' },
        },
      };
      const heroModel = {
        attributes: {
          name: { type: 'string' },
          inners: {
            type: 'component',
            component: 'default.inner',
            repeatable: true,
          },
        },
      };
      const otherModel = {
        attributes: {
          name: { type: 'string' },
        },
      };
      const modelDef = {
        attributes: {
          blocks: {
            type: 'dynamiczone',
            components: ['default.hero', 'default.other'],
            pluginOptions: { i18n: { localized: false } },
          },
        },
      };

      global.strapi = {
        getModel: (uid: string) =>
          ({
            model: modelDef,
            'default.hero': heroModel,
            'default.other': otherModel,
            'default.inner': innerModel,
          })[uid],
        components: {
          'default.hero': heroModel,
          'default.other': otherModel,
          'default.inner': innerModel,
        },
      } as any;

      const entry = {
        blocks: [
          { __component: 'default.hero', name: 'keep-parent', inners: [] },
          { __component: 'default.other', name: 'replacement' },
        ],
      };
      const relatedEntry = {
        blocks: [
          {
            __component: 'default.hero',
            name: 'old-parent',
            inners: [{ label: 'keep-inner' }],
          },
          {
            __component: 'default.hero',
            name: 'different-component',
            inners: [{ label: 'do-not-copy' }],
          },
        ],
      };

      fillNonLocalizedAttributes(entry, relatedEntry, { model: 'model' });

      expect(entry.blocks).toEqual([
        {
          __component: 'default.hero',
          name: 'keep-parent',
          inners: [{ label: 'keep-inner' }],
        },
        { __component: 'default.other', name: 'replacement' },
      ]);
    });
  });

  describe('getNestedPopulateOfNonLocalizedAttributes', () => {
    beforeAll(() => {
      const getModel = (model: string) =>
        ({
          'api::country.country': {
            attributes: {
              name: {
                type: 'string',
              },
              nonLocalizedName: {
                type: 'string',
                pluginOptions: {
                  i18n: {
                    localized: false,
                  },
                },
              },
              comp: {
                type: 'component',
                repeatable: false,
                component: 'basic.mycompo',
                pluginOptions: {
                  i18n: {
                    localized: false,
                  },
                },
              },
              dz: {
                type: 'dynamiczone',
                components: ['basic.mycompo', 'default.mydz'],
                pluginOptions: {
                  i18n: {
                    localized: false,
                  },
                },
              },
              myrelation: {
                type: 'relation',
                relation: 'manyToMany',
                target: 'api::category.category',
                inversedBy: 'addresses',
              },
            },
          },
          'basic.mycompo': {
            attributes: {
              title: {
                type: 'string',
              },
              image: {
                allowedTypes: ['images', 'files', 'videos'],
                type: 'media',
                multiple: false,
              },
            },
          },
          'default.mydz': {
            attributes: {
              name: {
                type: 'string',
              },
              picture: {
                type: 'media',
              },
            },
          },
        })[model];

      global.strapi = { getModel } as any;
    });

    test('Populate component, dz and media and not relations', () => {
      const result = getNestedPopulateOfNonLocalizedAttributes('api::country.country');

      expect(result).toEqual(['comp', 'dz', 'comp.image', 'dz.image', 'dz.picture']);
    });
  });
});
