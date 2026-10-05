import type { Core, Data, UID } from '@strapi/types';

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import urlJoin from 'url-join';

import { sanitize, ALLOWED_QUERY_PARAM_KEYS } from '@strapi/utils';
import _ from 'lodash';
import type { EmailSettings, PluginContext, User } from '../types';
import { getService } from '../utils';

const { pick, get, toNumber } = _;

const USER_MODEL_UID = 'plugin::users-permissions.user';

const pickAllowedQueryParams = (params: Record<string, unknown>) =>
  pick(params, ALLOWED_QUERY_PARAM_KEYS);

const getSessionManager = (strapi: Core.Strapi) => {
  const manager = strapi.sessionManager;
  return manager ?? null;
};

/** Manage user accounts, passwords, and confirmation emails. */
export default ({ strapi }: PluginContext) => ({
  /** Count users after transforming supported Content API query parameters. */

  count(params?: Record<string, unknown>) {
    const query = strapi
      .get('query-params')
      .transform(USER_MODEL_UID, pickAllowedQueryParams(params ?? {}));

    return strapi.db.query(USER_MODEL_UID).count(query);
  },

  /** Hash password attributes in place using their configured encryption rounds. */
  async ensureHashedPasswords(values: Record<string, unknown>) {
    const attributes = strapi.getModel(USER_MODEL_UID).attributes;

    for (const key in values) {
      if (attributes[key] && attributes[key].type === 'password') {
        // Check if a custom encryption.rounds has been set on the password attribute
        const rounds = toNumber(get(attributes[key], 'encryption.rounds', 10));
        const value = values[key];
        if (typeof value !== 'string') {
          throw new TypeError('Password value must be a string');
        }
        Object.assign(values, { [key]: await bcrypt.hash(value, rounds) });
      }
    }

    return values;
  },

  /** Create a user, letting the Document Service process password and relation inputs. */
  async add(values: Record<string, unknown>) {
    // Use the Document Service so relation inputs accept both the internal
    // numeric id (legacy) and the documentId (v5 default) syntax, consistent
    // with every other content-type endpoint. The Document Service hashes
    // `password` attributes itself, so we must not pre-hash here.
    return strapi.documents(USER_MODEL_UID).create({
      data: values,
      populate: ['role'],
    });
  },

  /** Update a user addressed by its database id through the Document Service. */
  async edit(userId: Data.ID, params: Record<string, unknown> = {}) {
    // The user is addressed by its numeric id (e.g. the `/users/:id` route),
    // but the Document Service updates by documentId. Resolve it first so the
    // relation inputs are processed by the Document Service, which accepts both
    // numeric ids (legacy) and documentIds (v5 default). The Document Service
    // hashes `password` attributes itself, so we must not pre-hash here.
    const entry = await strapi.db
      .query(USER_MODEL_UID)
      .findOne({ where: { id: userId }, select: ['documentId'] });

    if (!entry) {
      return null;
    }

    return strapi.documents(USER_MODEL_UID).update({
      documentId: entry.documentId,
      data: params,
      populate: ['role'],
    });
  },

  /** Fetch one user while retaining the id restriction alongside query filters. */
  fetch(id: Data.ID, params?: Record<string, unknown>) {
    const query = strapi
      .get('query-params')
      .transform(USER_MODEL_UID, pickAllowedQueryParams(params ?? {}));

    return strapi.db.query(USER_MODEL_UID).findOne({
      ...query,
      where: {
        $and: [{ id }, query.where || {}],
      },
    });
  },

  /** Fetch an authenticated account with its role. */
  fetchAuthenticatedUser(id: Data.ID): Promise<User | null> {
    return strapi.db.query(USER_MODEL_UID).findOne({ where: { id }, populate: ['role'] });
  },

  /** Fetch users using supported Content API query parameters. */
  fetchAll(params?: Record<string, unknown>) {
    const query = strapi
      .get('query-params')
      .transform(USER_MODEL_UID, pickAllowedQueryParams(params ?? {}));

    return strapi.db.query(USER_MODEL_UID).findMany(query);
  },

  /** Invalidate an account's sessions before removing it. */
  async remove(params: Record<string, unknown> & { id?: Data.ID }) {
    // Invalidate sessions for all affected users
    const sessionManager = getSessionManager(strapi);
    if (sessionManager && sessionManager.hasOrigin('users-permissions') && params.id) {
      await sessionManager('users-permissions').invalidateRefreshToken(String(params.id));
    }

    return strapi.db.query(USER_MODEL_UID).delete({ where: params });
  },

  validatePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  },

  async sendConfirmationEmail(user: User) {
    const userPermissionService = getService(strapi, 'users-permissions');
    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
    const userSchema = strapi.getModel(USER_MODEL_UID);

    const settings = await pluginStore
      .get<EmailSettings>({ key: 'email' })
      .then((storeEmail) => storeEmail.email_confirmation.options);

    // Sanitize the template's user information
    const sanitizedUserInfo = await sanitize.sanitizers.defaultSanitizeOutput(
      {
        schema: userSchema,
        getModel: (uid) => strapi.getModel(uid as UID.Schema),
      },
      user
    );

    const confirmationToken = crypto.randomBytes(20).toString('hex');

    await this.edit(user.id, { confirmationToken });

    const apiPrefix = strapi.config.get<string>('api.rest.prefix');

    try {
      settings.message = await userPermissionService.template(settings.message, {
        URL: urlJoin(
          strapi.config.get<string>('server.absoluteUrl'),
          apiPrefix,
          '/auth/email-confirmation'
        ),
        SERVER_URL: strapi.config.get<string>('server.absoluteUrl'),
        ADMIN_URL: strapi.config.get<string>('admin.absoluteUrl'),
        USER: sanitizedUserInfo,
        CODE: confirmationToken,
      });

      settings.object = await userPermissionService.template(settings.object, {
        USER: sanitizedUserInfo,
      });
    } catch {
      strapi.log.error(
        '[plugin::users-permissions.sendConfirmationEmail]: Failed to generate a template for "user confirmation email". Please make sure your email template is valid and does not contain invalid characters or patterns'
      );
      return;
    }

    // Send an email to the user.
    await strapi
      .plugin('email')
      .service('email')
      .send({
        to: user.email,
        from:
          settings.from.email && settings.from.name
            ? `${settings.from.name} <${settings.from.email}>`
            : undefined,
        replyTo: settings.response_email,
        subject: settings.object,
        text: settings.message,
        html: settings.message,
      });
  },
});
