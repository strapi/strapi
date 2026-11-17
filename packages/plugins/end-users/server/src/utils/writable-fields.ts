import type { Core } from '@strapi/types';

import { NOT_GRANTABLE } from '../services/permission-layout';
import {
  engineOwnedUserFields,
  REQUEST_NEVER_WRITES_USER_RELATIONS,
} from './engine-owned-user-fields';
import { USER_UID } from '../constants';
import { contentTypesOf } from './typed-strapi';

type Attributes = Record<
  string,
  { private?: boolean; writable?: boolean; pluginOptions?: unknown }
>;

const attributesOf = (strapi: Core.Strapi, uid: string): Attributes =>
  contentTypesOf<Record<string, { attributes?: Attributes }>>(strapi)[uid]?.attributes ?? {};

/** The user type's fields no request writes: the engine-owned ones the type carries, and the roles */
const engineOwnedOf = (attributes: Attributes): ReadonlySet<string> =>
  new Set([...engineOwnedUserFields(attributes), ...REQUEST_NEVER_WRITES_USER_RELATIONS]);

/**
 * The attributes of a type a request can write, taken now, as a role's Create and Update rows are
 * seeded with them instead of "every field". Left out: the attributes every caller reads and no one
 * writes (`NOT_GRANTABLE`), private and `writable: false` attributes, and on the end-user type the
 * fields only the plugin writes (the ban, the verified flag, `roles`). A component or relation is
 * named once, as the Content API's field rules take it.
 */
export const writableFields = (strapi: Core.Strapi, uid: string): string[] => {
  const attributes = attributesOf(strapi, uid);
  const engineOwned = uid === USER_UID ? engineOwnedOf(attributes) : new Set<string>();

  return Object.entries(attributes)
    .filter(
      ([name, attribute]) =>
        !NOT_GRANTABLE.has(name) &&
        attribute.private !== true &&
        attribute.writable !== false &&
        !engineOwned.has(name)
    )
    .map(([name]) => name);
};

/** The engine-owned user fields a read row may still name: U&P exposed `confirmed`, and this is its successor */
const READABLE_ENGINE_OWNED: ReadonlySet<string> = new Set(['emailVerified']);

/**
 * The attributes of a type a role's read rows may name: not private, not `NOT_GRANTABLE`, and on the
 * end-user type not the fields only the plugin writes, bar the verified flag. Two-factor state and
 * the sign-in dates are never readable through a role.
 */
export const readableFields = (strapi: Core.Strapi, uid: string): string[] => {
  const attributes = attributesOf(strapi, uid);
  const engineOwned = uid === USER_UID ? engineOwnedUserFields(attributes) : [];

  return Object.entries(attributes)
    .filter(
      ([name, attribute]) =>
        !NOT_GRANTABLE.has(name) &&
        attribute.private !== true &&
        !(engineOwned.includes(name) && !READABLE_ENGINE_OWNED.has(name))
    )
    .map(([name]) => name);
};
