import type { Core, Struct } from '@strapi/types';

import { PLUGIN_OPTION, SPACE_ATTRIBUTE, SPACE_UID } from '../../../shared/constants';

/**
 * Models that carry a space even though they are not user content types:
 * everything a space user can reach through the admin and would otherwise see
 * across tenants.
 */
export const ALWAYS_SCOPED_UIDS = [
  'plugin::upload.file',
  'plugin::upload.folder',
  'plugin::content-releases.release',
  'plugin::content-releases.release-action',
  'plugin::review-workflows.workflow',
  'plugin::review-workflows.workflow-stage',
] as const;

/**
 * Models that must never carry a space, whatever else says otherwise. These are
 * the platform's own records: identities, the permission system, the space
 * registry, and the schemas themselves.
 */
export const NEVER_SCOPED_UIDS = new Set<string>([
  'admin::user',
  'admin::role',
  'admin::permission',
  'admin::api-token',
  'admin::api-token-permission',
  'admin::transfer-token',
  'admin::transfer-token-permission',
  'admin::session',
  'plugin::spaces.space',
  'plugin::spaces.space-membership',
  'plugin::i18n.locale',
  'plugin::users-permissions.role',
  'plugin::users-permissions.permission',
]);

interface ScopeOptions {
  /**
   * `false` opts a content type out of tenancy: one shared set of entries every
   * space sees and the platform maintains. Useful for reference data.
   */
  scoped?: boolean;
}

const readOptions = (model: Struct.Schema | undefined): ScopeOptions =>
  ((model?.pluginOptions as Record<string, ScopeOptions> | undefined)?.[PLUGIN_OPTION] ??
    {}) as ScopeOptions;

/**
 * Whether entries of this model belong to a space.
 *
 * Everything a project defines is scoped, because a project's content is what
 * tenancy is about. Plugin-owned models are not, unless they are named in
 * {@link ALWAYS_SCOPED_UIDS} — a plugin's data is usually platform
 * configuration. Either choice can be overridden per content type with
 * `pluginOptions.spaces.scoped`.
 */
export const isScopedContentType = (model: Struct.Schema | undefined): boolean => {
  if (!model?.uid) {
    return false;
  }

  if (NEVER_SCOPED_UIDS.has(model.uid)) {
    return false;
  }

  const options = readOptions(model);

  if (options.scoped !== undefined) {
    return options.scoped;
  }

  if ((ALWAYS_SCOPED_UIDS as readonly string[]).includes(model.uid)) {
    return true;
  }

  return model.uid.startsWith('api::');
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const service = {
    isScopedContentType,

    /** Every model that carries a `space` attribute at runtime. */
    listScopedUids(): string[] {
      return Object.values(strapi.contentTypes)
        .filter((contentType) => Boolean(contentType.attributes?.[SPACE_ATTRIBUTE]))
        .filter(
          (contentType) =>
            (contentType.attributes[SPACE_ATTRIBUTE] as { target?: string }).target === SPACE_UID
        )
        .map((contentType) => contentType.uid);
    },

    /** The content types a space may use, honouring its availability list. */
    listAvailableUids(space: { contentTypes?: string[] | null }): string[] {
      const scoped = service.listScopedUids();

      if (!space.contentTypes) {
        return scoped;
      }

      return scoped.filter((uid) => space.contentTypes!.includes(uid));
    },

    /**
     * The content types an administrator can choose from when deciding what a
     * space may use: the project's own, since plugin-owned ones are not
     * something a space opts out of.
     */
    listSelectableUids(): string[] {
      return service.listScopedUids().filter((uid) => uid.startsWith('api::'));
    },
  };

  return service;
};
