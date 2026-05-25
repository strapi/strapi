import type { Core } from '@strapi/types';

import {
  attachServiceContentType,
  runUnscoped,
  scopeReadByCurrentSpace,
  wrapControllerForVisibility,
} from './settings-visibility';

/**
 * Spaces × i18n integration. Wires the reusable visibility-binding pattern around the
 * i18n plugin's locale service + controller, with zero changes to i18n's source. Every
 * patch is guarded behind a `strapi.plugin('i18n')` check so Spaces stays drop-in
 * compatible with a Strapi install that has i18n disabled.
 *
 * Model:
 *   - `register.ts` injects a hidden `spaces` (manyToMany) relation on `plugin::i18n.locale`.
 *     Empty list = platform-wide = visible in every space.
 *   - Read scoping: list/code/count reads filter to `spaces.slug = currentSlug` OR
 *     `spaces is empty`. The Settings page opts out with `?scope=all` so the platform
 *     admin sees every locale regardless of active space.
 *   - Write scoping: the i18n `createLocale` / `updateLocale` controllers are wrapped
 *     to extract the `spaces` array from the request body before i18n's Yup validation
 *     strips it, then assign the M2M link rows after the original controller returns.
 *   - Default-locale-per-space is still keyed `default_locale_<spaceSlug>` so each
 *     space picks its own default; we fall back to the original `default_locale` key
 *     when a space has no explicit default.
 */
const I18N_LOCALE_UID = 'plugin::i18n.locale';
const DEFAULT_LOCALE_STORE_KEY = 'default_locale';

const perSpaceStoreKey = (spaceSlug: string | undefined) =>
  spaceSlug ? `${DEFAULT_LOCALE_STORE_KEY}_${spaceSlug}` : DEFAULT_LOCALE_STORE_KEY;

const getCurrentSpaceSlug = (strapi: Core.Strapi): string | undefined =>
  strapi.requestContext.get()?.state?.spaceSlug as string | undefined;

export const patchI18nForSpaces = async (strapi: Core.Strapi) => {
  if (!strapi.plugin('i18n')) return;

  const localesService = strapi.plugin('i18n').service('locales') as any;
  if (!localesService) return;

  /* ----------------------------- 1. Read scope ---------------------------- */

  // Mark the service so the read-wrapper knows which content type to query for the
  // `spaces` populate side-channel.
  attachServiceContentType(localesService, I18N_LOCALE_UID);
  scopeReadByCurrentSpace(strapi, localesService, ['find', 'count']);

  // `findByCode(code: string)` takes a primitive, not a `where`-shaped argument, so it
  // doesn't fit the generic wrapper. Re-implement using the (now-wrapped) `find` so it
  // inherits the visibility filter for free.
  const originalFindByCode = localesService.findByCode?.bind(localesService);
  if (originalFindByCode) {
    localesService.findByCode = async (code: string) => {
      const spaceSlug = getCurrentSpaceSlug(strapi);
      if (!spaceSlug) return originalFindByCode(code);
      const results = await localesService.find({ code });
      return Array.isArray(results) ? results[0] ?? null : results;
    };
  }

  /* --------------------------- 2. Write scope ----------------------------- */

  // Pull the i18n core store up here so the `validateRemoval` closure below captures
  // an already-initialized binding. (Closures formed earlier in the function would
  // still work via lexical scoping — the binding resolves at call time — but
  // declaring before use makes the read order obvious.)
  const i18nStore = strapi.store({ type: 'plugin', name: 'i18n' });

  // Route-level Koa middleware that strips `spaces` from POST/PUT bodies before i18n's
  // Yup validation sees them, then writes the M2M link rows after the controller
  // succeeds. See `wrapControllerForVisibility` for why this can't be done by
  // monkey-patching the controller directly in bootstrap.
  wrapControllerForVisibility(strapi, {
    contentTypeUid: I18N_LOCALE_UID,
    routes: [
      { method: 'POST', pathRegex: /^\/i18n\/locales\/?$/ },
      { method: 'PUT', pathRegex: /^\/i18n\/locales\/[^/]+\/?$/, isUpdate: true },
    ],
    // Safety check: reject a locale-visibility update that would drop the locale from
    // a space where it's still load-bearing — either because it's that space's default
    // locale, or because there are localized entries in that space using its code.
    // Atomic 400: the host controller hasn't run yet, so the locale row is untouched.
    validateRemoval: async (strapi, { resourceId, removedSlugs, currentResource }) => {
      const localeCode: string | undefined = currentResource?.code;
      if (!localeCode || removedSlugs.length === 0) return null;

      const failures: string[] = [];

      // --- Default-locale check ---
      // i18n stores the per-space default under `default_locale_<slug>` (set when an
      // admin clicks "Set as default" while in that space); the platform-wide store key
      // (`default_locale`) is the fallback for spaces that haven't chosen one. If a
      // removed space's effective default is *this* locale, refuse — the admin must
      // pick a new default for that space first.
      const platformDefault = (await i18nStore.get({ key: DEFAULT_LOCALE_STORE_KEY })) as
        | string
        | null;
      for (const slug of removedSlugs) {
        const perSpaceKey = `${DEFAULT_LOCALE_STORE_KEY}_${slug}`;
        const perSpaceDefault = (await i18nStore.get({ key: perSpaceKey })) as string | null;
        const effectiveDefault = perSpaceDefault ?? platformDefault;
        if (effectiveDefault === localeCode) {
          failures.push(
            `Cannot remove locale "${localeCode}" from space "${slug}": it is the default ` +
              `locale of that space. Set a different default for "${slug}" first.`
          );
        }
      }

      // --- Existing-entries check ---
      // Iterate every localized content type; for each, count rows in any of the removed
      // spaces with the locale's code. If any row exists, refuse — those rows would be
      // orphaned (their `locale` would no longer be visible from their space).
      const localizedCTs = Object.values(strapi.contentTypes).filter(
        (ct: any) => ct.pluginOptions?.i18n?.localized === true
      );
      const removedSpaceRows = await strapi.db
        .query('plugin::spaces.space')
        .findMany({ where: { slug: { $in: removedSlugs } }, select: ['id', 'slug'] });
      const slugById = new Map(removedSpaceRows.map((s: any) => [s.id, s.slug]));

      for (const ct of localizedCTs) {
        const uid = (ct as any).uid as string;
        // Only space-scoped CTs have a `space` FK; others are platform-wide data and
        // a missing locale in the space wouldn't matter.
        if (!(ct as any).pluginOptions?.spaces?.scope) continue;
        for (const space of removedSpaceRows) {
          const count = await strapi.db.query(uid).count({
            where: { locale: localeCode, space: { id: space.id } },
          });
          if (count > 0) {
            failures.push(
              `Cannot remove locale "${localeCode}" from space "${slugById.get(
                space.id
              )}": ${count} ${uid} entr${count === 1 ? 'y' : 'ies'} use this locale in ` +
                `that space. Move or delete them first.`
            );
          }
        }
      }
      // unused-var guard for `resourceId` (kept in signature for symmetry with future CTs)
      void resourceId;

      return failures.length > 0 ? failures.join(' ') : null;
    },

    // Extra form field: `defaultIn: string[]` — the spaces this locale should be the
    // default for. Persisted after the M2M `spaces` write so we can validate against
    // the final bound set + auto-promote for spaces that have no default yet.
    extraBodyFields: [
      {
        name: 'defaultIn',
        onAfterWrite: async (strapi, { resourceId, finalSlugs, requestedFor, resource }) => {
          const localeCode: string | undefined = resource?.code;
          if (!localeCode) return;

          // Only spaces this locale is bound to can validly be in `defaultIn`. Strip any
          // slugs the admin somehow submitted for spaces the locale isn't visible in.
          // Platform-wide (`finalSlugs.length === 0`) treats every space as bound.
          const isBound = (slug: string) =>
            finalSlugs.length === 0 || finalSlugs.includes(slug);
          let normalizedDefaultIn = requestedFor.filter(isBound);

          // Auto-promotion: for every space this locale is now bound to that doesn't have
          // a default yet, include it in `defaultIn` so the new locale becomes that
          // space's default. Matches the user's "French should become Acme's default"
          // intuition without requiring an explicit checkbox click. Skipped on update if
          // the admin's submitted `defaultIn` already covers the bound set (i.e., we
          // don't override explicit human choice).
          const platformDefault = (await i18nStore.get({ key: DEFAULT_LOCALE_STORE_KEY })) as
            | string
            | null;
          const allSpaces = (await strapi.db
            .query('plugin::spaces.space')
            .findMany({ select: ['slug'] })) as Array<{ slug: string }>;
          const targetSlugs =
            finalSlugs.length === 0 ? allSpaces.map((s) => s.slug) : finalSlugs;
          for (const slug of targetSlugs) {
            const perSpaceKey = `${DEFAULT_LOCALE_STORE_KEY}_${slug}`;
            const perSpaceDefault = (await i18nStore.get({ key: perSpaceKey })) as
              | string
              | null;
            if (!perSpaceDefault && !platformDefault && !normalizedDefaultIn.includes(slug)) {
              normalizedDefaultIn.push(slug);
            }
          }

          // Write per-space default-locale keys for everything in `normalizedDefaultIn`.
          // For slugs NOT in `normalizedDefaultIn`, we only clear the key if it currently
          // points at this locale (otherwise we'd be stomping unrelated state).
          for (const slug of targetSlugs) {
            const perSpaceKey = `${DEFAULT_LOCALE_STORE_KEY}_${slug}`;
            if (normalizedDefaultIn.includes(slug)) {
              await i18nStore.set({ key: perSpaceKey, value: localeCode });
            } else {
              const current = (await i18nStore.get({ key: perSpaceKey })) as string | null;
              if (current === localeCode) {
                await i18nStore.delete({ key: perSpaceKey });
              }
            }
          }
          void resourceId;
        },
      },
    ],
  });

  /* ------------------------ 3. Per-space default -------------------------- */

  // Install a per-space default-locale strategy via i18n's public extension API
  // (`setDefaultLocaleStrategy`). This replaces the previous direct-monkey-patch on
  // `getDefaultLocale`/`setDefaultLocale`, which was incomplete because i18n's
  // `setIsDefault` calls a module-local `getDefaultLocale` — bypassing any service-
  // method override and leaving the locale list's `isDefault` flag at the global
  // value. The strategy hook routes all three (`get`, `set`, `isDefault`) through one
  // central object so the list-response flag matches the picker's expectation.
  //
  // Storage: per-space key `default_locale_<spaceSlug>` (set when an admin clicks
  // "Set as default" while in a specific space). When a space has no explicit default
  // and the platform-wide fallback isn't visible in that space, fall back to the
  // first locale that *is* visible — self-healing for spaces that lose their
  // configured default through a visibility change.
  if (typeof localesService.setDefaultLocaleStrategy === 'function') {
    const i18nStoreClosure = i18nStore;
    const localesServiceClosure = localesService;

    localesService.setDefaultLocaleStrategy({
      async get() {
        const spaceSlug = getCurrentSpaceSlug(strapi);
        if (!spaceSlug) {
          return (await i18nStoreClosure.get({ key: 'default_locale' })) as
            | string
            | null
            | undefined;
        }

        // Candidate: per-space override → platform-wide → first visible.
        const perSpace = (await i18nStoreClosure.get({
          key: perSpaceStoreKey(spaceSlug),
        })) as string | null;
        const platform = (await i18nStoreClosure.get({ key: 'default_locale' })) as
          | string
          | null;
        const candidate = perSpace ?? platform ?? null;

        const visible = (await localesServiceClosure.find()) as
          | Array<{ code: string }>
          | undefined;
        if (!Array.isArray(visible) || visible.length === 0) return candidate;
        const visibleCodes = new Set(visible.map((l) => l.code));
        if (candidate && visibleCodes.has(candidate)) return candidate;
        return visible[0].code;
      },

      async set(code: string) {
        const spaceSlug = getCurrentSpaceSlug(strapi);
        if (!spaceSlug) {
          await i18nStoreClosure.set({ key: 'default_locale', value: code });
          return;
        }
        await i18nStoreClosure.set({ key: perSpaceStoreKey(spaceSlug), value: code });
      },

      async isDefault(code: string) {
        // Match-against the same resolution as `get`, so the list-response `isDefault`
        // flag agrees with the picker's redirect-to-default effect.
        const spaceSlug = getCurrentSpaceSlug(strapi);
        if (!spaceSlug) {
          const actual = (await i18nStoreClosure.get({ key: 'default_locale' })) as
            | string
            | null;
          return actual === code;
        }
        const perSpace = (await i18nStoreClosure.get({
          key: perSpaceStoreKey(spaceSlug),
        })) as string | null;
        const platform = (await i18nStoreClosure.get({ key: 'default_locale' })) as
          | string
          | null;
        const candidate = perSpace ?? platform ?? null;
        const visible = (await localesServiceClosure.find()) as
          | Array<{ code: string }>
          | undefined;
        if (!Array.isArray(visible) || visible.length === 0) return candidate === code;
        const visibleCodes = new Set(visible.map((l) => l.code));
        const effective = candidate && visibleCodes.has(candidate) ? candidate : visible[0]?.code;
        return effective === code;
      },

      /**
       * Enumerate the effective default locale for every space. i18n's `setIsDefault`
       * uses this to attach `isDefaultIn: string[]` to each locale row, so the Settings
       * table's "Default in" chip column and the locale edit form's multi-checkbox
       * render correctly without making N store reads per row. Resolution mirrors `get`:
       * per-space override → platform-wide → first locale visible in that space.
       *
       * Returns an empty object when no spaces are loaded (e.g. very early bootstrap).
       */
      async listDefaults() {
        const allSpaces = (await runUnscoped(() =>
          strapi.db
            .query('plugin::spaces.space')
            .findMany({ select: ['slug'] })
        )) as Array<{ slug: string }>;
        if (!Array.isArray(allSpaces) || allSpaces.length === 0) return {};

        const platform = (await i18nStoreClosure.get({ key: 'default_locale' })) as
          | string
          | null;

        // We need the locale list per-space — but the wrapped `find` filters by the
        // *request* context, not by an arbitrary space. So we hit `db.query` directly,
        // populating the M2M `spaces` join, and group locales by which spaces they're
        // visible in.
        const allLocales = (await runUnscoped(() =>
          strapi.db
            .query('plugin::i18n.locale')
            .findMany({ populate: { spaces: { select: ['slug'] } } })
        )) as Array<{ code: string; spaces?: Array<{ slug: string }> }>;

        const visibleCodesBySpace = new Map<string, string[]>();
        for (const space of allSpaces) visibleCodesBySpace.set(space.slug, []);
        for (const locale of allLocales) {
          const boundSlugs = locale.spaces?.map((s) => s.slug) ?? [];
          // Empty spaces = platform-wide = visible in every space.
          const targets = boundSlugs.length === 0 ? allSpaces.map((s) => s.slug) : boundSlugs;
          for (const slug of targets) {
            visibleCodesBySpace.get(slug)?.push(locale.code);
          }
        }

        const result: Record<string, string> = {};
        for (const space of allSpaces) {
          const perSpace = (await i18nStoreClosure.get({
            key: perSpaceStoreKey(space.slug),
          })) as string | null;
          const candidate = perSpace ?? platform ?? null;
          const visibleCodes = visibleCodesBySpace.get(space.slug) ?? [];
          if (candidate && visibleCodes.includes(candidate)) {
            result[space.slug] = candidate;
          } else if (visibleCodes.length > 0) {
            result[space.slug] = visibleCodes[0];
          }
          // Otherwise leave the slug out — that space has no default and no locales.
        }
        return result;
      },
    });
  }

  // NOTE: the previous `beforeCreate` lifecycle that auto-stamped a single `space` FK
  // from the request context has been removed. Locale-space binding is now explicit via
  // the form's `spaces` multi-select, processed by `wrapControllerForVisibility` above.

  /* ----- 4. Bypass space filter for i18n's super-admin permission sync ----- */

  // i18n's `syncSuperAdminPermissionsWithLocales` mirrors every locale code onto the
  // super-admin role's permission entries (so super-admin always has access to every
  // locale on every localized CT). It calls `localesService.find()` internally — which
  // we've patched to filter by current space. When a locale is created from inside a
  // tenant view (Acme), `afterCreate` fires the sync, the filtered `find()` returns
  // only Acme-visible locales, and super-admin's permission entries get rewritten with
  // an incomplete `locales` array — silently dropping access to locales scoped to
  // other spaces.
  //
  // Fix: wrap the sync method so its inner reads run under `runUnscoped`, which makes
  // `scopeReadByCurrentSpace` act as a passthrough for the duration of the call.
  const i18nPermissionsActions = (strapi.plugin('i18n').service('permissions') as any)
    ?.actions;
  if (i18nPermissionsActions && typeof i18nPermissionsActions.syncSuperAdminPermissionsWithLocales === 'function') {
    // We replace (not just wrap) the method with a defensive reimplementation. Two
    // reasons:
    //   1. The original calls `actionProvider.appliesToProperty(...)` per permission row,
    //      and the action provider throws when a permission's `action` isn't registered
    //      (e.g. an orphan row from an uninstalled plugin). One bad row aborts the entire
    //      sync, including writes that would have succeeded. The replacement swallows the
    //      per-row error and keeps going.
    //   2. The replacement runs the locale list read under `runUnscoped` so the wrapped
    //      `localesService.find()` sees every locale rather than only those visible in
    //      the request's active space — without that, syncing from inside Acme would
    //      rewrite super-admin's locale arrays with the Acme-only set.
    i18nPermissionsActions.syncSuperAdminPermissionsWithLocales = async () => {
      return runUnscoped(async () => {
        const roleService = strapi.service('admin::role') as any;
        const permissionService = strapi.service('admin::permission') as any;
        const { actionProvider } = strapi.service('admin::permission') as any;

        const superAdminRole = await roleService.getSuperAdmin();
        if (!superAdminRole) return;

        const superAdminPermissions: any[] = await permissionService.findMany({
          where: { role: { id: superAdminRole.id } },
        });

        const allLocales: any[] = await localesService.find();
        const allLocaleCodes = allLocales.map((l: any) => l.code);

        const updatedPermissions = (
          await Promise.all(
            superAdminPermissions.map(async (permission) => {
              const { action, subject } = permission;
              let appliesToLocalesProperty: boolean;
              try {
                appliesToLocalesProperty = await actionProvider.appliesToProperty(
                  'locales',
                  action,
                  subject
                );
              } catch (err) {
                // Orphan permission referencing an action that isn't currently registered
                // (e.g. left over from an uninstalled plugin). Return `null` to drop it
                // from the bulk `assignPermissions` write below — Strapi's permission
                // service rejects unknown actions on assignment, so leaving them in would
                // abort the whole sync. The row stays in the DB; we just don't re-assert it.
                strapi.log.debug?.(
                  `[spaces] Skipping permission ${permission.id} (${action}) during super-admin locale sync: ${(err as Error).message}`
                );
                return null;
              }
              if (!appliesToLocalesProperty) return permission;
              const oldProperties = permission.properties ?? {};
              return {
                ...permission,
                properties: { ...oldProperties, locales: allLocaleCodes },
              };
            })
          )
        ).filter((p): p is NonNullable<typeof p> => p !== null);

        await roleService.assignPermissions(superAdminRole.id, updatedPermissions);
      });
    };

    /* ----- 5. One-shot resync on bootstrap ----- */

    // Recover any super-admin permission rows that were narrowed by a prior space-filtered
    // sync (or were never updated). Idempotent — re-running with the full locale list just
    // re-asserts the same data.
    try {
      await i18nPermissionsActions.syncSuperAdminPermissionsWithLocales();
      strapi.log.info(
        '[spaces] Re-synced super-admin permissions across all locales (idempotent recovery for any earlier space-scoped sync runs).'
      );
    } catch (err) {
      strapi.log.warn(
        `[spaces] Re-sync of super-admin permissions failed: ${(err as Error).message}`
      );
    }
  }
};
