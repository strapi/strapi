import 'koa-body';
import type { Context, Next } from 'koa';
import type * as UID from '../uid';
import type { SuggestedString } from '../utils/string';
import type { IsDynamicName, IsStrict, RegisteredRecord } from './strictness';

export type Controller = Record<string, ControllerHandler>;

/**
 * Resolves application overrides before package defaults. With strict types enabled, an unregistered
 * literal UID resolves to `never`; with strict types disabled, every UID resolves to the legacy controller.
 */
export type ControllerFor<TUID extends string> = IsStrict extends false
  ? Controller
  : TUID extends keyof Strapi.Registries.AppControllers
    ? Strapi.Registries.AppControllers[TUID]
    : TUID extends keyof Strapi.Registries.PackageControllers
      ? Strapi.Registries.PackageControllers[TUID]
      : IsDynamicName<TUID> extends true
        ? // TODO @Nico decide whether dynamic names should also close in strict mode
          Controller
        : never;
/**
 * Return type of `strapi.controller<T>(uid)`: `T` when the UID kept its wide default, which happens
 * when the caller passes an explicit type argument (TypeScript then does not infer the UID) or a
 * dynamic UID; the registered lookup otherwise.
 */
export type ControllerLookup<TUID extends ControllerLookupUID, T> = UID.Controller extends TUID
  ? T
  : ControllerFor<TUID>;

/** Controller UIDs that have a registered contract. */
export type RegisteredControllerUID =
  | keyof Strapi.Registries.AppControllers
  | keyof Strapi.Registries.PackageControllers;

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
  [TName in keyof TControllers &
    string]: `${TName}.${keyof ControllerInstance<TControllers[TName]> & string}`;
}[keyof TControllers & string] extends infer TRelative extends string
  ? TRelative | `${TNamespace}.${TRelative}`
  : never;
