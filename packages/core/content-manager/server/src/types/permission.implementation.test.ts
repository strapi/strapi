// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Equal, Expect } from './assert.test';
import type { PermissionService } from './services';
import type permission from '../services/permission';

type Permission = ReturnType<typeof permission>;

export type Assertions = [
  Expect<
    Equal<
      Parameters<Permission['canConfigureContentType']>,
      Parameters<PermissionService['canConfigureContentType']>
    >
  >,
  Expect<
    Equal<
      ReturnType<Permission['canConfigureContentType']>,
      ReturnType<PermissionService['canConfigureContentType']>
    >
  >,
  Expect<
    Equal<
      Parameters<Permission['registerPermissions']>,
      Parameters<PermissionService['registerPermissions']>
    >
  >,
];
