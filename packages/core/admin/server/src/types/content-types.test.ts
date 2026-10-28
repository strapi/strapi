// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Schema } from '@strapi/types';
import type { RoleSchema, UserSchema } from './content-types';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const checks: [
  Expect<Equal<Schema.ContentType<'admin::user'>, UserSchema>>,
  Expect<Equal<Schema.ContentType<'admin::role'>, RoleSchema>>,
];
checks satisfies unknown;

// Admin declares its content-type schemas: the Document Service reads them without type generation.
const adminUser = await strapi.documents('admin::user').findFirst({ populate: ['roles'] });
if (adminUser !== null) {
  adminUser.email satisfies string | null;
  adminUser.firstname satisfies string | null;
  adminUser.roles satisfies Array<{ code?: string | null }>;
  adminUser.createdAt satisfies string | null;
  // @ts-expect-error Not an attribute of admin::user.
  adminUser.missing satisfies unknown;
}
// @ts-expect-error Filters are checked against the declared schema.
strapi.documents('admin::role').findMany({ filters: { missing: { $eq: 'x' } } });
// @ts-expect-error Writes are checked against the declared schema.
strapi.documents('admin::api-token').update({ documentId: 'x', data: { missing: 'x' } });
strapi.getModel('admin::session').attributes.sessionId satisfies Schema.Attribute.String;
// Content types no package declares stay generic.
strapi.documents('api::article.article').findMany({ filters: { anything: { $eq: 1 } } });
