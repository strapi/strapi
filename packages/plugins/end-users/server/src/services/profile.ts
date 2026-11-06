import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { PROFILE_UID } from '../constants';

type Plain = Record<string, unknown>;

/** What a `me` route passes on of the request's query: the parts that shape one entry. */
export interface ProfileQuery {
  fields?: unknown;
  populate?: unknown;
}

interface Documents {
  findFirst(params: Plain): Promise<{ documentId: string } | null>;
  update(params: Plain): Promise<unknown>;
}

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The core service of the profile type, with the two methods the `me/profile` routes use: the
 * caller's own profile, found by who the caller is and never by an id the request sent.
 */
export default factories.createCoreService(PROFILE_UID, ({ strapi }: { strapi: Core.Strapi }) => {
  const documents = () => strapi.documents(PROFILE_UID) as unknown as Documents;

  /**
   * An empty value would be dropped from the filter, and the filter would then match the first
   * profile of anyone: the one thing these methods must never do.
   */
  const assertCaller = (userDocumentId: unknown): void => {
    if (typeof userDocumentId !== 'string' || userDocumentId === '') {
      throw new errors.UnauthorizedError();
    }
  };

  const ownedBy = (userDocumentId: string) => ({ user: { documentId: userDocumentId } });

  return {
    /** The profile of the user, or `null` when there is none. Only `fields` and `populate` apply. */
    async findForUser(userDocumentId: string, query: ProfileQuery = {}) {
      assertCaller(userDocumentId);

      const { fields, populate } = query;

      return documents().findFirst({
        filters: ownedBy(userDocumentId),
        ...(fields !== undefined && { fields }),
        ...(populate !== undefined && { populate }),
      });
    },

    /**
     * Updates the user's own profile and returns it. `params` is what the core `update` takes
     * (`data`, `fields`, `populate`), already sanitized for the caller. Whose profile it is never
     * changes here: `user` in the data is refused, so a profile cannot be handed to someone else
     * or left with no owner.
     */
    async updateForUser(userDocumentId: string, params: ProfileQuery & { data?: unknown }) {
      assertCaller(userDocumentId);

      const { data, fields, populate } = params;

      if (!isPlain(data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      if ('user' in data) {
        throw new errors.ValidationError('The user of a profile cannot be changed', {
          errors: [
            {
              path: ['user'],
              message: 'The user of a profile cannot be changed',
              name: 'ValidationError',
            },
          ],
        });
      }

      const profile = await documents().findFirst({
        filters: ownedBy(userDocumentId),
        fields: ['documentId'],
      });

      if (!profile) {
        throw new errors.NotFoundError('Profile not found');
      }

      return documents().update({
        documentId: profile.documentId,
        data,
        ...(fields !== undefined && { fields }),
        ...(populate !== undefined && { populate }),
      });
    },
  };
});
