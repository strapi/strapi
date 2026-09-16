import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { SPACE_ATTRIBUTE, SPACE_UID } from '../../../shared/constants';
import { getScope } from './context';

/**
 * Whether a model's rows belong to a space, decided from the database metadata
 * rather than the schema, so it stays true for models a plugin registered
 * directly.
 */
const carriesSpace = (strapi: Core.Strapi, uid: string): boolean => {
  const model = strapi.db.metadata.has?.(uid) ? strapi.db.metadata.get(uid) : undefined;
  const attribute = model?.attributes?.[SPACE_ATTRIBUTE] as
    | { type?: string; target?: string }
    | undefined;

  return attribute?.type === 'relation' && attribute.target === SPACE_UID;
};

/**
 * Stamps new rows with the space they are being created in.
 *
 * This is a database lifecycle rather than a document-service middleware
 * because rows are created by more than the document service: the upload plugin
 * writes files and folders straight through `db.query`, releases write their
 * own actions, and history writes versions. Every one of those ends up here.
 *
 * Reads are not the concern of this subscriber — the query scope narrows those,
 * and it does so for populate and raw queries too, which lifecycles never see.
 */
export const registerWriteStamping = (strapi: Core.Strapi) => {
  const stamp = (uid: string, data: Record<string, unknown> | undefined | null) => {
    if (!data || typeof data !== 'object') {
      return;
    }

    // An explicit space wins: the migration assigns rows to a space, and the
    // cross-space view names the space it is creating into.
    if (data[SPACE_ATTRIBUTE] !== undefined) {
      return;
    }

    if (!carriesSpace(strapi, uid)) {
      return;
    }

    const scope = getScope(strapi);

    if (scope.mode === 'unresolved') {
      // An INSERT has no rows to narrow, so the query scope lets it through.
      // Left alone the row would be written with no space and become visible to
      // every tenant — the one way a request with no space could still affect
      // one. Refusing is the same answer reads get.
      throw new errors.ForbiddenError(
        scope.reason ??
          `This request has no space, so it cannot create ${uid}. If this runs outside a ` +
            `request, wrap it in runUnscoped() or runInSpace().`
      );
    }

    if (scope.mode !== 'space') {
      // `global` and `unscoped` leave the row shared, which is what the
      // migration, the CLI and deliberate cross-space work want.
      return;
    }

    data[SPACE_ATTRIBUTE] = scope.id;
  };

  return strapi.db.lifecycles.subscribe({
    beforeCreate(event) {
      stamp(event.model.uid, event.params.data as Record<string, unknown>);
    },

    beforeCreateMany(event) {
      const rows = event.params.data;

      if (Array.isArray(rows)) {
        for (const row of rows) {
          stamp(event.model.uid, row as Record<string, unknown>);
        }
      }
    },

    /**
     * A row's space is not something an update may change — moving content
     * between spaces has its own action, which checks both ends. Anything
     * arriving here through ordinary entry data is dropped.
     */
    beforeUpdate(event) {
      const data = event.params.data as Record<string, unknown> | undefined;

      if (data && SPACE_ATTRIBUTE in data && !isDeliberateMove(strapi)) {
        delete data[SPACE_ATTRIBUTE];
      }
    },

    beforeUpdateMany(event) {
      const data = event.params.data as Record<string, unknown> | undefined;

      if (data && SPACE_ATTRIBUTE in data && !isDeliberateMove(strapi)) {
        delete data[SPACE_ATTRIBUTE];
      }
    },
  });
};

/**
 * Moving content between spaces runs unscoped, on purpose and from one place.
 * Anywhere else, a `space` in update data is a caller trying to reassign a row
 * by writing to it.
 */
const isDeliberateMove = (strapi: Core.Strapi) => getScope(strapi).mode === 'unscoped';
