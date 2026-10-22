import 'koa-body';
import type { Context, Next } from 'koa';
import type * as UID from '../uid';
import type * as InternalUID from '../internal/uid';
import type { SuggestedString } from '../utils/string';
import type { IsStrict, RegisteredRecord } from './strictness';
import type { Strapi } from './strapi';

export type Controller = Record<string, ControllerHandler>;

/**
 * Resolves application overrides before package defaults. With strict types enabled, an unregistered
 * UID resolves to `unknown`, so callers pass a type argument; with strict types disabled, every UID
 * resolves to the legacy controller.
 */
export type ControllerFor<TUID extends string> = IsStrict extends false
  ? Controller
  : TUID extends keyof Strapi.Registries.AppControllers
    ? Strapi.Registries.AppControllers[TUID]
    : TUID extends keyof Strapi.Registries.PackageControllers
      ? Strapi.Registries.PackageControllers[TUID]
      : unknown;
/**
 * Return type of `strapi.controller<T>(uid)`: `T` when the UID kept its wide default, which happens
 * when the caller passes an explicit type argument (TypeScript then does not infer the UID) or a
 * dynamic UID; the registered lookup otherwise.
 */
export type ControllerLookup<TUID extends ControllerLookupUID, T> = UID.Controller extends TUID
  ? T
  : ControllerFor<TUID>;

/**
 * Controller UIDs that have a registered contract. Registry keys outside the UID pattern, such as a UID
 * without its namespace, are ignored, so looking them up fails.
 */
export type RegisteredControllerUID = Extract<
  keyof Strapi.Registries.AppControllers | keyof Strapi.Registries.PackageControllers,
  InternalUID.Controller
>;

/** A UID accepted by `strapi.controller(uid)`. Registered UIDs are listed for completion. */
export type ControllerLookupUID = SuggestedString<RegisteredControllerUID, UID.Controller>;

/**
 * Controllers keyed by UID, e.g. `strapi.controllers`. With strict types enabled, registered UIDs
 * resolve to their contracts. Other keys, literal or dynamic, resolve to the legacy controller: an
 * index signature cannot close literal keys while keeping dynamic keys open, unlike `strapi.controller(uid)`.
 */
export type ControllerMap = IsStrict extends false
  ? Record<string, Controller>
  : RegisteredRecord<{ [TUID in RegisteredControllerUID]: ControllerFor<TUID> }, Controller>;

/**
 * A UID accepted by {@link ControllerFactory}. With strict types enabled, only registered UIDs: a
 * factory checked against a UID without a contract would accept any controller. An application
 * controller registered with the type its module provides (`Strapi.Registries.InferredControllers`)
 * is rejected too (TS2344): that type is read from the factory being checked.
 */
export type ControllerFactoryUID = IsStrict extends false
  ? UID.Controller
  : Exclude<RegisteredControllerUID, keyof Strapi.Registries.InferredControllers>;

/**
 * A controller factory, checked against the contract registered for `TUID`. The controllers
 * registry calls a function controller once with `{ strapi }` and caches its result as the
 * controller (`packages/core/core/src/registries/controllers.ts:26-37`), which
 * `strapi.controller(uid)` returns.
 *
 * With strict types disabled, the factory may return any object. Develop has no public type for a
 * controller factory, and `Controller` rejects what `createCoreController` returns: its index
 * signature is missing from the returned type (TS1360).
 *
 * Type generation registers an application controller with the `ControllerContract` type its module
 * exports (`types/generated/controllers.ts`), so the factory of that module can be checked against
 * its own UID. Without that export, type generation lists the UID in
 * `Strapi.Registries.InferredControllers`, so it is not a {@link ControllerFactoryUID} (TS2344), as
 * for services (see `ServiceFactory`).
 *
 * @example
 * ```ts
 * // src/api/article/controllers/article.ts
 * export type ControllerContract = Core.CoreAPI.Controller.ContentType<'api::article.article'> & {
 *   titles: Core.ControllerHandler<string[]>;
 * };
 *
 * export default factories.createCoreController('api::article.article', ({ strapi }) => ({
 *   async titles() {
 *     return strapi.service('api::article.article').findPublishedTitles();
 *   },
 * })) satisfies Core.ControllerFactory<'api::article.article'>;
 *
 * // A plugin controller, whose contract the plugin registers in `PackageControllers`
 * export default (({ strapi }) => ({
 *   async list(ctx) {
 *     ctx.body = await strapi.plugin('my-plugin').service('items').findAll();
 *   },
 * })) satisfies Core.ControllerFactory<'plugin::my-plugin.items'>;
 * ```
 */
export type ControllerFactory<TUID extends ControllerFactoryUID> = (params: {
  strapi: Strapi;
}) => IsStrict extends false
  ? object
  : // An inferred entry is not read: it depends on the factory checked against it
    TUID extends keyof Strapi.Registries.InferredControllers
    ? unknown
    : ControllerFor<TUID>;

export interface ControllerHandler<TResponse = unknown> {
  (context: Context, next: Next): Promise<TResponse | void> | TResponse | void;
}

/** The controller a controller map entry provides: the entry itself, or what a controller factory returns. */
type ControllerInstance<TEntry> = TEntry extends (...args: any[]) => infer TController
  ? TController
  : TEntry;

/**
 * `'<controller>.<action>'` for every action of a controller map, such as a plugin's `controllers` export.
 * With `TNamespace` (e.g. `'plugin::my-plugin'`), `'<namespace>.<controller>.<action>'` is accepted too.
 */
export type ControllerActionReference<TControllers, TNamespace extends string = never> = {
  [
    TName in keyof TControllers & string
  ]: `${TName}.${keyof ControllerInstance<TControllers[TName]> & string}`;
}[keyof TControllers & string] extends infer TRelative extends string
  ? TRelative | `${TNamespace}.${TRelative}`
  : never;
