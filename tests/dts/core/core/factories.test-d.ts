import { describe, expectTypeOf, test } from 'vitest';
import type { Core, Modules } from '@strapi/types';
import { factories } from '@strapi/core';

import '../../fixtures/content-types';

type Factory<T> = (params: { strapi: Core.Strapi }) => T;
type Built<T> = T extends Factory<infer R> ? R : never;
type Handler = Core.ControllerHandler<unknown>;

describe('createCoreController', () => {
  test('builds the collection type actions', () => {
    const controller = factories.createCoreController('api::article.article');
    type Controller = Built<typeof controller>;

    // `toEqualTypeOf` passes when the actual type is `any`, so guard against it first
    expectTypeOf<Controller>().not.toBeAny();
    expectTypeOf<Parameters<Handler>[0]>().not.toBeAny();
    expectTypeOf<Parameters<Controller['sanitizeQuery']>[0]>().not.toBeAny();

    expectTypeOf<Controller['find']>().toEqualTypeOf<Handler>();
    expectTypeOf<Controller['findOne']>().toEqualTypeOf<Handler>();
    expectTypeOf<Controller['create']>().toEqualTypeOf<Handler>();
    expectTypeOf<Controller['update']>().toEqualTypeOf<Handler>();
    expectTypeOf<Controller['delete']>().toEqualTypeOf<Handler>();
    expectTypeOf<Controller>().toHaveProperty('sanitizeQuery');
  });

  test('builds the single type actions', () => {
    const controller = factories.createCoreController('api::homepage.homepage');
    type Controller = Built<typeof controller>;

    expectTypeOf<Controller['find']>().toEqualTypeOf<Handler>();
    expectTypeOf<Controller['update']>().toEqualTypeOf<Handler>();
    expectTypeOf<Controller['delete']>().toEqualTypeOf<Handler>();
  });

  test('keeps custom actions and types `this` as the core controller', () => {
    const controller = factories.createCoreController('api::article.article', ({ strapi }) => ({
      // Actions that use `this` need an explicit return type, or their inference is circular
      async published(ctx): Promise<unknown> {
        expectTypeOf(strapi).toEqualTypeOf<Core.Strapi>();
        // Every core action is optional on `this`, since the configuration may override any of them
        expectTypeOf(this.find).toEqualTypeOf<Handler | undefined>();
        expectTypeOf(this.sanitizeQuery).toEqualTypeOf<
          Core.CoreAPI.Controller.Base['sanitizeQuery'] | undefined
        >();

        return this.find?.(ctx, async () => {});
      },
    }));

    type Controller = Built<typeof controller>;

    expectTypeOf<Controller['published']>().toBeFunction();
    expectTypeOf<Controller['findOne']>().toEqualTypeOf<Handler>();
    // @ts-expect-error only core and custom actions exist
    expectTypeOf<Controller['unpublished']>();
  });

  test('infers custom actions from a plain object configuration', () => {
    const controller = factories.createCoreController('api::article.article', {
      published: async () => 'published' as const,
    });

    expectTypeOf<Built<typeof controller>['published']>().toEqualTypeOf<
      () => Promise<'published'>
    >();
  });

  test('accepts a plain object configuration', () => {
    expectTypeOf(factories.createCoreController).toBeCallableWith('api::article.article', {
      async find(ctx) {
        return this.sanitizeQuery?.(ctx);
      },
    });
  });

  test('rejects unknown content types', () => {
    // @ts-expect-error not in the content-type registry
    factories.createCoreController('api::unknown.unknown');
  });
});

describe('createCoreService', () => {
  test('builds the collection type methods', () => {
    const service = factories.createCoreService('api::article.article');
    type Service = Built<typeof service>;

    expectTypeOf<Service>().not.toBeAny();
    expectTypeOf<Modules.Documents.AnyDocument>().not.toBeAny();

    expectTypeOf<Service['find']>().returns.resolves.toHaveProperty('results');
    expectTypeOf<Service['findOne']>().parameter(0).toEqualTypeOf<Modules.Documents.ID>();
    expectTypeOf<
      Service['findOne']
    >().returns.resolves.toEqualTypeOf<Modules.Documents.AnyDocument | null>();
    expectTypeOf<Service['delete']>().returns.resolves.toEqualTypeOf<{ deletedEntries: number }>();
  });

  test('builds the single type methods', () => {
    const service = factories.createCoreService('api::homepage.homepage');
    type Service = Built<typeof service>;

    expectTypeOf<
      Service['find']
    >().returns.resolves.toEqualTypeOf<Modules.Documents.AnyDocument | null>();
    expectTypeOf<Service['createOrUpdate']>()
      .parameter(0)
      .toEqualTypeOf<{ data: Record<string, unknown>; [key: string]: unknown }>();
  });

  test('keeps custom methods and types `this` as the core service', () => {
    const service = factories.createCoreService('api::article.article', () => ({
      // Methods that use `this` need an explicit return type, or their inference is circular
      async findPublished(): Promise<Modules.Documents.AnyDocument[]> {
        const page = await this.find?.({ status: 'published' });
        return page?.results ?? [];
      },
      countPublished: async (total: number) => total,
    }));
    type Service = Built<typeof service>;

    expectTypeOf<Service['findPublished']>().toEqualTypeOf<
      () => Promise<Modules.Documents.AnyDocument[]>
    >();
    expectTypeOf<Service['countPublished']>().toEqualTypeOf<(total: number) => Promise<number>>();
    // @ts-expect-error only core and custom methods exist
    expectTypeOf<Service['findDrafts']>();
  });

  test('rejects unknown content types', () => {
    // @ts-expect-error not in the content-type registry
    factories.createCoreService('api::unknown.unknown');
  });
});

describe('createCoreRouter', () => {
  test('returns a router', () => {
    expectTypeOf(
      factories.createCoreRouter('api::article.article')
    ).toEqualTypeOf<Core.CoreAPI.Router.Router>();
  });

  test('accepts route configuration', () => {
    expectTypeOf(factories.createCoreRouter).toBeCallableWith('api::article.article', {
      prefix: '/blog',
      only: ['find', 'findOne'],
      type: 'content-api',
      config: {
        find: { auth: false, policies: ['global::is-owner'], middlewares: [] },
        findOne: { auth: { scope: ['api::article.article.findOne'] } },
      },
    });
  });

  test('rejects invalid configuration', () => {
    // @ts-expect-error unknown router type
    factories.createCoreRouter('api::article.article', { type: 'public' });
    // @ts-expect-error auth must be `false` or a scope object
    factories.createCoreRouter('api::article.article', { config: { find: { auth: true } } });
    // @ts-expect-error not in the content-type registry
    factories.createCoreRouter('api::unknown.unknown');
  });
});

describe('createCoreValidator', () => {
  test('requires a content type and a Strapi instance', () => {
    expectTypeOf(factories.createCoreValidator).parameter(1).toEqualTypeOf<Core.Strapi>();
    // @ts-expect-error not in the content-type registry
    factories.createCoreValidator('api::unknown.unknown', {} as Core.Strapi);
  });
});

describe('isCustomController', () => {
  test('narrows nothing and returns a boolean', () => {
    expectTypeOf(factories.isCustomController).returns.toEqualTypeOf<boolean>();
    expectTypeOf(factories.isCustomController).toBeCallableWith({} as Core.Controller);
  });
});
