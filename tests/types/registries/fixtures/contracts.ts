// Strict mode with generated `services.d.ts` and `controllers.d.ts`, written by the consumer test
// from `app/src/api`. The application sources check their factories against their contracts.
import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

// An `any` lookup accepts every member: each lookup below rejects one outside its contract.

// A contract export registers the contract, core service methods included.
const article = app.service('api::article.article');
article.findIds() satisfies Promise<string[]>;
article.find satisfies (...args: never[]) => Promise<unknown>;
// @ts-expect-error Members outside the contract are not registered.
article.missing();

// A contract re-exported from a shared file.
const stats = app.service('api::article.stats');
stats.total() satisfies Promise<number>;
app.api('article').service('stats') satisfies typeof stats;
// @ts-expect-error Members outside the contract are not registered.
stats.missing();

// Without a contract export, the service keeps the type its factory returns.
const legacy = app.service('api::article.legacy');
legacy.ping() satisfies 'pong';
// @ts-expect-error The inferred service has no other member.
legacy.missing();

// A controller contract.
const statsController = app.controller('api::article.stats');
statsController.summary satisfies Core.ControllerHandler<{ total: number }>;
// @ts-expect-error Actions outside the contract are not registered.
statsController.missing satisfies unknown;
