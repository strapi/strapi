import * as yup from 'yup';

import {
  AuditLogWorkspaceCell,
  getAuditLogWorkspaceFilter,
  isDefaultWorkspace,
} from './components/AuditLogWorkspace';
import { EntryLockHeaderAction } from './components/EntryLockHeaderAction';
import { guardContentManagerActions } from './components/guardActions';
import { MoveToSpaceBulkAction, MoveToSpaceHeaderAction } from './components/MoveToSpaceActions';
import { ReleaseWorkspaceStatus } from './components/ReleaseWorkspaceStatus';
import { addWorkspaceFilterHook } from './components/WorkspaceFilter';
import { addWorkspaceColumnHook } from './components/WorkspaceListCell';
import { WorkspacePanel } from './components/WorkspacePanel';
import { workspaceEntryLockMiddleware } from './middlewares/rbac-middleware';
import {
  getLocaleSpacesInitialValues,
  isLocaleReadOnlyInWorkspace,
  LocaleDefaultInCell,
  LocaleSpacesCell,
  LocaleSpacesFormSection,
} from './components/LocaleIntegration';
import {
  getRoleWorkspacesInitialValue,
  RoleWorkspacesField,
} from './components/RoleWorkspacesField';
import {
  getTokenWorkspacesInitialValue,
  TokenWorkspacesField,
} from './components/TokenWorkspacesField';
import {
  getUserWorkspacesInitialValue,
  UserWorkspacesField,
} from './components/UserWorkspacesField';
import { SpaceSwitcher } from './components/SpaceSwitcher';
import { SpaceVisibility } from './components/SpaceVisibility';
import { PERMISSIONS } from './constants';
import { pluginId } from './pluginId';
import { installSpaceHeaderInterceptor } from './utils/fetchInterceptor';
import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from './utils/currentSpace';
import { getTranslation } from './utils/getTranslation';
import { isReadOnlyInWorkspace } from './utils/workspaceAccess';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';
import { useWorkspaceReadOnlyRule } from './utils/useWorkspaceReadOnlyRule';
import { useWorkspaceSettingsMenuMutator } from './utils/useWorkspaceSettingsMenuMutator';

import {
  registerMainNavAddon,
  registerRoleFormExtension,
  registerSettingsMenuMutator,
  registerTokenFormExtension,
  registerUserFormExtension,
} from '@strapi/admin/strapi-admin';

import { registerAuditLogFilter, registerAuditLogTableColumn } from '@strapi/admin/strapi-admin/ee';

import type { StrapiApp } from '@strapi/admin/strapi-admin';
import type {
  BulkActionComponent,
  ContentManagerPlugin,
  DocumentActionComponent,
} from '@strapi/content-manager/strapi-admin';

const CM_HOOKS = {
  INJECT_COLUMN_IN_TABLE: 'Admin/CM/pages/ListView/inject-column-in-table',
  INJECT_LIST_VIEW_FILTERS: 'Admin/CM/pages/ListView/inject-in-filters',
};

type ContentTypeBuilderFormsAPI = {
  components: {
    add: (component: { id: string; component: unknown }) => void;
  };
  extendContentType: (extension: {
    validator: () => Record<string, unknown>;
    form: {
      advanced: () => Array<Record<string, unknown>>;
    };
  }) => void;
};

/** Extension points exposed by the CTB's admin (`app.getPlugin('content-type-builder').apis`). */
type ContentTypeBuilderApis = {
  forms: ContentTypeBuilderFormsAPI;
  registerReadOnlyRule?: (rule: {
    id: string;
    useRule: () => { readOnly: boolean; reason?: { id: string; defaultMessage: string } };
  }) => void;
};

/** Extension points exposed by i18n's admin (see i18n's `admin/src/i18n-plugin.ts`). */
type I18nSpacesApis = {
  registerLocaleFormExtension?: (extension: {
    id: string;
    Component: typeof LocaleSpacesFormSection;
    getInitialValues?: (locale?: unknown) => Record<string, unknown>;
    isReadOnly?: (locale: unknown) => boolean;
  }) => void;
  registerLocaleTableColumn?: (column: {
    id: string;
    header: { id: string; defaultMessage: string };
    Cell: typeof LocaleSpacesCell;
  }) => void;
};

// eslint-disable-next-line import/no-default-export
export default {
  register(app: StrapiApp) {
    // Every backend request from the admin carries the active space from now on.
    installSpaceHeaderInterceptor();

    // Entries a sub-workspace may not edit (shared entries) are locked in the
    // Content Manager by dropping the write permissions for that document.
    app.addRBACMiddleware([workspaceEntryLockMiddleware]);

    app.registerPlugin({
      id: pluginId,
      name: pluginId,
    });
  },
  bootstrap(app: StrapiApp) {
    /* ------------------------- Content Manager ------------------------- */

    const contentManager = app.getPlugin('content-manager');
    const contentManagerApis = contentManager.apis as ContentManagerPlugin['config']['apis'];

    contentManagerApis.addDocumentAction((actions: DocumentActionComponent[]) => {
      actions.push(MoveToSpaceHeaderAction);
      return actions;
    });
    contentManagerApis.addBulkAction((actions: BulkActionComponent[]) => {
      actions.push(MoveToSpaceBulkAction);
      return actions;
    });
    // On an entry the workspace may not edit, every document/bulk action is
    // disabled except the non-mutating ones (duplicate, configure, history).
    guardContentManagerActions(
      contentManagerApis as unknown as Parameters<typeof guardContentManagerActions>[0]
    );
    // Read-only lock in the edit-view header, "Workspace" side panel.
    contentManagerApis.addDocumentHeaderAction([EntryLockHeaderAction]);
    contentManagerApis.addEditViewSidePanel([WorkspacePanel]);
    // "Workspace" column and filter in the list view (default workspace only).
    app.registerHook(CM_HOOKS.INJECT_COLUMN_IN_TABLE, addWorkspaceColumnHook);
    app.registerHook(CM_HOOKS.INJECT_LIST_VIEW_FILTERS, addWorkspaceFilterHook);

    // The switcher lives in the main navigation, right above the user avatar.
    registerMainNavAddon({ id: 'spaces-switcher', Component: SpaceSwitcher });

    // Hide the default-only Settings entries outside the default workspace.
    registerSettingsMenuMutator({
      id: 'spaces-default-only-settings',
      useMutator: useWorkspaceSettingsMenuMutator,
    });

    // Role ↔ workspace association on the role edit page (default workspace
    // only — see RoleWorkspacesField). The `spaces` value rides the role
    // update body; the server-side wrapper extracts it and writes the M2M.
    registerRoleFormExtension({
      id: 'spaces-role-workspaces',
      field: 'spaces',
      Component: RoleWorkspacesField,
      getInitialValue: getRoleWorkspacesInitialValue,
      // Shared roles are read-only outside default (server: `workspaceAccess`).
      isReadOnly: isReadOnlyInWorkspace,
    });

    // API token ↔ workspace binding on the token create/edit page (default
    // workspace only). Enforced at auth level server-side: a bound token
    // cannot leave its workspaces whatever header the caller sends.
    registerTokenFormExtension({
      id: 'spaces-token-workspaces',
      field: 'spaces',
      Component: TokenWorkspacesField,
      getInitialValue: getTokenWorkspacesInitialValue,
      isReadOnly: isReadOnlyInWorkspace,
    });

    // User ↔ workspace membership on the invite/edit forms (default workspace
    // only). The `spaces` value rides the user create/update body; the
    // server-side wrapper extracts it and writes the M2M.
    registerUserFormExtension({
      id: 'spaces-user-workspaces',
      field: 'spaces',
      Component: UserWorkspacesField,
      getInitialValue: getUserWorkspacesInitialValue,
    });

    /* ----------------------------- Settings ----------------------------- */

    app.addSettingsLink('global', {
      intlLabel: {
        id: getTranslation('settings.title'),
        defaultMessage: 'Workspaces',
      },
      id: 'workspaces',
      to: 'workspaces',
      Component: () =>
        import('./pages/SettingsPage').then((mod) => ({ default: mod.ProtectedSettingsPage })),
      permissions: PERMISSIONS.createSpace,
    });

    /* ---------------------- Content-Type Builder ----------------------- */

    const ctbPlugin = app.getPlugin('content-type-builder');

    if (ctbPlugin) {
      const ctbApis = ctbPlugin.apis as ContentTypeBuilderApis;
      const ctbFormsAPI = ctbApis.forms;

      // The schema is global: outside the default workspace the builder is
      // browsable but read-only (the server refuses schema writes there too).
      ctbApis.registerReadOnlyRule?.({
        id: 'spaces-default-workspace-only',
        useRule: useWorkspaceReadOnlyRule,
      });

      ctbFormsAPI.components.add({ id: 'spaces-workspaces', component: SpaceVisibility });

      ctbFormsAPI.extendContentType({
        // `enabled` / `scope` stay accepted so schemas that opt out in
        // schema.json survive a CTB save; the form exposes the workspaces
        // dropdown and the two sharing toggles.
        validator: () => ({
          spaces: yup.object().shape({
            enabled: yup.bool(),
            scope: yup.string().oneOf(['space', 'platform', 'none']),
            visibleIn: yup.array().of(yup.string()),
            sharedEntries: yup.bool(),
            sharedEditable: yup.bool(),
          }),
        }),
        form: {
          advanced() {
            return [
              {
                name: 'pluginOptions.spaces.visibleIn',
                type: 'spaces-workspaces',
                size: 6,
                intlLabel: {
                  id: getTranslation('ctb.workspaces.label'),
                  defaultMessage: 'Workspaces',
                },
                description: {
                  id: getTranslation('ctb.workspaces.description'),
                  defaultMessage:
                    'One checked = exclusive to that workspace. Several = shared between them.',
                },
              },
              {
                name: 'pluginOptions.spaces.sharedEntries',
                type: 'checkbox',
                size: 6,
                intlLabel: {
                  id: getTranslation('ctb.sharedEntries.label'),
                  defaultMessage: 'Share every entry with all workspaces',
                },
                description: {
                  id: getTranslation('ctb.sharedEntries.description'),
                  defaultMessage:
                    'Entries are visible in every workspace and edited from the Default workspace. Turning it off makes existing entries exclusive to their workspace again; entries shared one by one stay shared.',
                },
              },
              {
                name: 'pluginOptions.spaces.sharedEditable',
                type: 'checkbox',
                size: 6,
                intlLabel: {
                  id: getTranslation('ctb.sharedEditable.label'),
                  defaultMessage: 'Let other workspaces edit shared entries',
                },
                description: {
                  id: getTranslation('ctb.sharedEditable.description'),
                  defaultMessage:
                    'Only applies when every entry is shared. Sub-workspaces can then create and edit entries of this type.',
                },
              },
            ];
          },
        },
      });
    }

    /* ---------------------------- Audit logs ---------------------------- */

    // Every audit log records the workspace it was performed in; the default
    // workspace (which sees them all) gets a column and a filter for it.
    registerAuditLogTableColumn({
      id: 'space',
      header: { id: getTranslation('list.column.label'), defaultMessage: 'Workspace' },
      Cell: AuditLogWorkspaceCell,
      isVisible: isDefaultWorkspace,
    });
    registerAuditLogFilter({
      id: 'spaces-workspace',
      getFilter: ({ formatMessage }) => getAuditLogWorkspaceFilter(formatMessage),
    });

    /* ---------------------------- Releases ------------------------------ */

    const releasesPlugin = app.getPlugin('content-releases');
    const releasesApis = releasesPlugin?.apis as
      | {
          registerReleaseDetailsExtension?: (extension: {
            id: string;
            Component: typeof ReleaseWorkspaceStatus;
            isPublishAllowed?: () => boolean;
          }) => void;
        }
      | undefined;

    // Per-workspace readiness next to the release status; a release publishes
    // as a whole, from the default workspace only (server-enforced too).
    releasesApis?.registerReleaseDetailsExtension?.({
      id: 'spaces-release-workspaces',
      Component: ReleaseWorkspaceStatus,
      isPublishAllowed: () => getCurrentSpaceSlug() === DEFAULT_SPACE_SLUG,
    });

    /* ------------------------------ i18n -------------------------------- */

    const i18nPlugin = app.getPlugin('i18n');

    if (i18nPlugin) {
      const i18nApis = i18nPlugin.apis as I18nSpacesApis;

      i18nApis.registerLocaleFormExtension?.({
        id: 'spaces-visibility',
        Component: LocaleSpacesFormSection,
        getInitialValues: getLocaleSpacesInitialValues,
        isReadOnly: isLocaleReadOnlyInWorkspace,
      });

      i18nApis.registerLocaleTableColumn?.({
        id: 'spaces-visibility',
        header: {
          id: getTranslation('visibilityField.label'),
          defaultMessage: 'Available in spaces',
        },
        Cell: LocaleSpacesCell,
      });

      i18nApis.registerLocaleTableColumn?.({
        id: 'spaces-default-in',
        header: {
          id: getTranslation('locales.defaultInColumn'),
          defaultMessage: 'Default in',
        },
        Cell: LocaleDefaultInCell,
      });
    }
  },
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  },
};
