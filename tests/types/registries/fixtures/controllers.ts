// Strict mode with a generated `controllers.d.ts`, written by the consumer test from `app/src/api`.
import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

/** `true` only for `unknown`: `any` and every other type give `false`. */
declare function exactlyUnknown<T>(
  value: T
): [unknown] extends [T] ? (0 extends 1 & T ? false : true) : false;
declare function isAny<T>(value: T): 0 extends 1 & T ? true : false;

// A core controller factory registers what it returns: the content-type actions.
const article = app.controller('api::article.article');
exactlyUnknown(article) satisfies false;
isAny(article) satisfies false;
article.find satisfies Core.ControllerHandler<unknown>;
article.findOne satisfies Core.ControllerHandler<unknown>;
article.sanitizeQuery satisfies (ctx: never) => Promise<Record<string, unknown>>;
const apiArticle = app.api('article').controller('article');
apiArticle satisfies typeof article;
article satisfies typeof apiArticle;

// A plain factory registers its return type, without the legacy index signature.
const report = app.controller('api::article.report');
isAny(report) satisfies false;
const summary = report.summary();
summary satisfies Promise<{ contentTypes: number; kind: 'summary' }>;
// @ts-expect-error The registered controller has no arbitrary members.
report.missing satisfies unknown;
app.api('article').controller('report') satisfies typeof report;

// A module without a default export registers `unknown`, like an unregistered UID.
exactlyUnknown(app.controller('api::article.helpers')) satisfies true;
exactlyUnknown(app.controller('api::missing.missing')) satisfies true;
exactlyUnknown(app.api('article').controller('missing')) satisfies true;
