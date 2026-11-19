// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core, Schema } from '@strapi/types';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type RepairParams = Parameters<
  Strapi.Registries.PackageServices['plugin::i18n.permissions']['actions']['repairPermissionsForNewlyLocalizedTypes']
>[0];

declare const syncContext: Core.ContentTypesSyncContext;

// The `strapi::content-types.afterSync` handler (`register.ts`) passes the hook context through, so
// the registered contract takes the schemas `@strapi/core` syncs, with no `any` left in them.
export type PermissionsImplementationAssertions = [
  Expect<
    Equal<
      [RepairParams['oldContentTypes']],
      [Record<string, Schema.ContentType> | null | undefined]
    >
  >,
  Expect<Equal<[RepairParams['contentTypes']], [Record<string, Schema.ContentType>]>>,
];

strapi
  .service('plugin::i18n.permissions')
  .actions.repairPermissionsForNewlyLocalizedTypes(syncContext) satisfies Promise<void>;
