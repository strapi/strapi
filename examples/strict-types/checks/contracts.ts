// Type checks only, run by `yarn test:ts`. This folder is outside `src/`, so the loaders never read
// it at runtime.
import { factories, type Core } from '@strapi/strapi';

import type { ServiceContract as ArticleService } from '../src/api/article/services/article';
import type { ControllerContract as ArticleController } from '../src/api/article/controllers/article';
import type { ServiceContract as StatsService } from '../src/api/stats/services/stats';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const strapi: Core.Strapi;

// Lookups resolve to the exported contracts. `Equal` cannot tell `any` from another type, so each
// lookup also rejects a member outside its contract below.
const article = strapi.service('api::article.article');
const articleController = strapi.controller('api::article.article');
const stats = strapi.service('api::stats.stats');
export type Lookups = [
  Core.Assert<Equal<typeof article, ArticleService>>,
  Core.Assert<Equal<typeof articleController, ArticleController>>,
  Core.Assert<Equal<typeof stats, StatsService>>,
];
// @ts-expect-error The registered contract has no other member.
article.missing();
// @ts-expect-error The registered contract has no other action.
articleController.missing satisfies unknown;
// @ts-expect-error The registered contract has no other member.
stats.missing();

// Without a contract export, the lookup is inferred from the factory.
strapi.service('api::legacy.legacy').ping() satisfies 'pong';
// @ts-expect-error The inferred service has no other member.
strapi.service('api::legacy.legacy').missing();
// @ts-expect-error An inferred service cannot check a factory: its type is read from the factory.
(() => ({ ping: () => 'pong' as const })) satisfies Core.ServiceFactory<'api::legacy.legacy'>;

// A factory is checked against the registered contract.
(() => ({
  // @ts-expect-error `articles` is a number in the contract.
  summary: async () => ({ articles: '1', legacy: 'pong' as const }),
})) satisfies Core.ServiceFactory<'api::stats.stats'>;

// A core controller without the contract's custom `titles` action.
const coreController = factories.createCoreController('api::article.article');
// @ts-expect-error `titles` is missing.
coreController satisfies Core.ControllerFactory<'api::article.article'>;

// @ts-expect-error A typo in the UID is not a registered service.
(() => ({})) satisfies Core.ServiceFactory<'api::articles.article'>;

// Edge cases kept on purpose to test type generation (see the comment of each module).
// An `export =` service registers the type its factory returns.
strapi.service('api::legacy.export-equals').ping() satisfies 'pong';
// @ts-expect-error The inferred service has no other member.
strapi.service('api::legacy.export-equals').missing();
// A CommonJS-style `.ts` service registers `unknown`, without an import of its file.
strapi.service('api::legacy.commonjs-style') satisfies unknown;
// @ts-expect-error `unknown` has no member.
strapi.service('api::legacy.commonjs-style').ping();
