// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { SanitizedAdminUser } from '@strapi/admin/strapi-admin';
import type { ReleaseDataResponse } from '../../../shared/contracts/releases';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// The shared contracts name the admin user that the admin panel exports, without loading the panel.
declare const checks: [Expect<Equal<ReleaseDataResponse['createdBy'], SanitizedAdminUser>>];
checks satisfies unknown;
