import type { Core, Struct } from '@strapi/types';
import { contentTypes, errors } from '@strapi/utils';

import { PLUGIN_ID, PROFILE_UID, ROLE_UID } from '../../constants';
import type roleService from '../../services/role';
import type compatService from '../../services/compat';
import { signedInUser } from '../login-response';
import { toUpRole } from '../shapes';
import { callCompat } from './call-compat';

/**
 * The slice of Nexus an extension uses. The GraphQL plugin hands the module to the extension, and
 * this plugin has no dependency on it of its own.
 */
interface FieldDefiner {
  nonNull: FieldDefiner;
  id(name: string, config?: object): void;
  string(name: string, config?: object): void;
  boolean(name: string, config?: object): void;
  field(name: string, config: object): void;
}

interface Nexus {
  nonNull(type: string): unknown;
  objectType(config: { name: string; definition(t: FieldDefiner): void }): unknown;
  inputObjectType(config: { name: string; definition(t: FieldDefiner): void }): unknown;
  extendType(config: { type: string; definition(t: FieldDefiner): void }): unknown;
}

interface GraphqlContext {
  koaContext: Parameters<typeof callCompat>[0];
  state?: { user?: { documentId?: unknown } };
}

/** The fields of the user that every answer has; a profile attribute of the same name never replaces one. */
const BASE_FIELDS = new Set([
  'id',
  'documentId',
  'username',
  'email',
  'confirmed',
  'blocked',
  'role',
]);

/** What the profile is made of that is not the project's: its identity, its link and the timestamps. */
const PROFILE_OWN_FIELDS = new Set([
  'id',
  'documentId',
  'user',
  contentTypes.constants.CREATED_AT_ATTRIBUTE,
  contentTypes.constants.UPDATED_AT_ATTRIBUTE,
  contentTypes.constants.PUBLISHED_AT_ATTRIBUTE,
  contentTypes.constants.FIRST_PUBLISHED_AT_ATTRIBUTE,
]);

/**
 * The profile's scalar attributes with their GraphQL scalar: what a project adds to its end users
 * is part of the user a login answers with, as it is of the REST payloads. Private attributes,
 * passwords, relations, media and components are not.
 */
export const profileScalarFields = (strapi: Core.Strapi): Array<{ name: string; type: string }> => {
  const schema = strapi.contentType(PROFILE_UID) as Struct.ContentTypeSchema;
  const { mappers } = strapi.plugin('graphql').service('utils');
  const fields: Array<{ name: string; type: string }> = [];

  for (const [name, attribute] of Object.entries(schema.attributes)) {
    const scalar =
      contentTypes.isScalarAttribute(attribute) && attribute.type !== 'password'
        ? (mappers.strapiScalarToGraphQLScalar(attribute.type) as string | undefined)
        : undefined;

    if (
      scalar &&
      !BASE_FIELDS.has(name) &&
      !PROFILE_OWN_FIELDS.has(name) &&
      !contentTypes.isPrivateAttribute(schema, name)
    ) {
      fields.push({ name, type: scalar });
    }
  }

  return fields;
};

/** The signed-in caller as the compat payloads show them: the profile fields and the one role. */
const meOf = async (strapi: Core.Strapi, documentId: string) => {
  const [user, held] = await Promise.all([
    signedInUser(strapi, documentId),
    (strapi.plugin(PLUGIN_ID).service('role') as ReturnType<typeof roleService>).getForUser(
      documentId
    ),
  ]);

  if (!user) {
    throw new errors.NotFoundError('Not Found');
  }

  return { ...user, role: toUpRole(held) };
};

/** The types, `Query.me` and the mutations of the users-permissions GraphQL schema. */
export const compatGraphqlTypes = (strapi: Core.Strapi, nexus: Nexus) => {
  const { nonNull } = nexus;

  const call = (path: string, context: GraphqlContext, body: unknown) =>
    callCompat(context.koaContext, path, body);

  const loginInput = nexus.inputObjectType({
    name: 'UsersPermissionsLoginInput',
    definition(t) {
      t.nonNull.string('identifier');
      t.nonNull.string('password');
      t.nonNull.string('provider', { default: 'local' });
    },
  });

  const registerInput = nexus.inputObjectType({
    name: 'UsersPermissionsRegisterInput',
    definition(t) {
      t.nonNull.string('username');
      t.nonNull.string('email');
      t.nonNull.string('password');
    },
  });

  const passwordPayload = nexus.objectType({
    name: 'UsersPermissionsPasswordPayload',
    definition(t) {
      t.nonNull.boolean('ok');
    },
  });

  const loginPayload = nexus.objectType({
    name: 'UsersPermissionsLoginPayload',
    definition(t) {
      t.string('jwt');
      t.nonNull.field('user', { type: 'UsersPermissionsMe' });
    },
  });

  const meRole = nexus.objectType({
    name: 'UsersPermissionsMeRole',
    definition(t) {
      t.nonNull.id('id');
      t.nonNull.string('name');
      t.string('description');
      t.string('type');
    },
  });

  const me = nexus.objectType({
    name: 'UsersPermissionsMe',
    definition(t) {
      t.nonNull.id('id');
      t.nonNull.id('documentId');
      t.string('username');
      t.string('email');
      t.boolean('confirmed');
      t.boolean('blocked');
      t.field('role', { type: 'UsersPermissionsMeRole' });

      for (const { name, type } of profileScalarFields(strapi)) {
        t.field(name, { type });
      }
    },
  });

  const query = nexus.extendType({
    type: 'Query',
    definition(t) {
      t.field('me', {
        type: 'UsersPermissionsMe',
        args: {},
        async resolve(_parent: unknown, _args: unknown, context: GraphqlContext) {
          const documentId = context.state?.user?.documentId;

          if (typeof documentId !== 'string' || documentId === '') {
            throw new errors.UnauthorizedError('Authentication requested');
          }

          return meOf(strapi, documentId);
        },
      });
    },
  });

  const mutation = nexus.extendType({
    type: 'Mutation',
    definition(t) {
      t.field('login', {
        type: nonNull('UsersPermissionsLoginPayload'),
        args: { input: nonNull('UsersPermissionsLoginInput') },
        resolve: (
          _parent: unknown,
          args: { input: Record<string, string> },
          context: GraphqlContext
        ) =>
          call('/local', context, {
            identifier: args.input.identifier,
            password: args.input.password,
          }),
      });

      t.field('register', {
        type: nonNull('UsersPermissionsLoginPayload'),
        args: { input: nonNull('UsersPermissionsRegisterInput') },
        description: 'Register a user',
        resolve: (
          _parent: unknown,
          args: { input: Record<string, string> },
          context: GraphqlContext
        ) =>
          call('/local/register', context, {
            username: args.input.username,
            email: args.input.email,
            password: args.input.password,
          }),
      });

      t.field('forgotPassword', {
        type: 'UsersPermissionsPasswordPayload',
        args: { email: nonNull('String') },
        description: 'Request a reset password token',
        async resolve(_parent: unknown, args: { email: string }, context: GraphqlContext) {
          await call('/forgot-password', context, { email: args.email });

          return { ok: true };
        },
      });

      t.field('resetPassword', {
        type: 'UsersPermissionsLoginPayload',
        args: {
          password: nonNull('String'),
          passwordConfirmation: nonNull('String'),
          code: nonNull('String'),
        },
        description: 'Reset user password. Confirm with a code (resetToken from forgotPassword)',
        resolve: (
          _parent: unknown,
          args: { password: string; passwordConfirmation: string; code: string },
          context: GraphqlContext
        ) =>
          call('/reset-password', context, {
            code: args.code,
            password: args.password,
            passwordConfirmation: args.passwordConfirmation,
          }),
      });

      t.field('changePassword', {
        type: 'UsersPermissionsLoginPayload',
        args: {
          currentPassword: nonNull('String'),
          password: nonNull('String'),
          passwordConfirmation: nonNull('String'),
        },
        description: 'Change user password. Confirm with the current password.',
        resolve: (
          _parent: unknown,
          args: { currentPassword: string; password: string; passwordConfirmation: string },
          context: GraphqlContext
        ) =>
          call('/change-password', context, {
            currentPassword: args.currentPassword,
            password: args.password,
            passwordConfirmation: args.passwordConfirmation,
          }),
      });

      t.field('emailConfirmation', {
        type: 'UsersPermissionsLoginPayload',
        args: { confirmation: nonNull('String') },
        description: 'Confirm an email users email address',
        resolve(_parent: unknown, args: { confirmation: string }, context: GraphqlContext) {
          const { request } = context.koaContext;

          return (
            strapi.plugin(PLUGIN_ID).service('compat') as ReturnType<typeof compatService>
          ).confirmEmail(args.confirmation, {
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          });
        },
      });
    },
  });

  return [loginInput, registerInput, passwordPayload, loginPayload, meRole, me, query, mutation];
};

/**
 * `login`, `register`, `forgotPassword`, `resetPassword` and `emailConfirmation` need no caller
 * (the routes behind them check the credentials); `changePassword` and `me` need a signed-in one,
 * which an operation of the schema needs by default.
 */
export const compatResolversConfig = () => ({
  'Mutation.login': { auth: false },
  'Mutation.register': { auth: false },
  'Mutation.forgotPassword': { auth: false },
  'Mutation.resetPassword': { auth: false },
  'Mutation.emailConfirmation': { auth: false },
});

/**
 * Adds the users-permissions operations to the GraphQL schema, when the GraphQL plugin is there and
 * the compatibility mode is on, and takes the role's mutations out of the schema. With it off nothing
 * is registered, and the schema has no `UsersPermissions*` operation of its own.
 */
export const registerCompatGraphql = (strapi: Core.Strapi, compat: boolean): void => {
  const graphql = strapi.plugin('graphql');

  if (!compat || !graphql) {
    return;
  }

  const extension = graphql.service('extension');

  // Roles are managed on the plugin's admin pages: users-permissions had create, update and delete
  // mutations for them, and they are not carried over
  extension.shadowCRUD(ROLE_UID).disableMutations();

  extension.use(({ nexus }: { nexus: Nexus }) => ({
    types: compatGraphqlTypes(strapi, nexus),
    resolversConfig: compatResolversConfig(),
  }));
};
