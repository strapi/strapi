import * as yup from 'yup';

import { MoveToSpaceBulkAction, MoveToSpaceHeaderAction } from './components/MoveToSpaceActions';
import {
  getLocaleSpacesInitialValues,
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
import { SpaceSwitcher } from './components/SpaceSwitcher';
import { SpaceVisibility } from './components/SpaceVisibility';
import { PERMISSIONS } from './constants';
import { pluginId } from './pluginId';
import { installSpaceHeaderInterceptor } from './utils/fetchInterceptor';
import { getTranslation } from './utils/getTranslation';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';
import { useWorkspaceMainMenuMutator } from './utils/useWorkspaceMainMenuMutator';
import { useWorkspaceSettingsMenuMutator } from './utils/useWorkspaceSettingsMenuMutator';

import {
  registerMainNavAddon,
  registerMenuMutator,
  registerRoleFormExtension,
  registerSettingsMenuMutator,
  registerTokenFormExtension,
} from '@strapi/admin/strapi-admin';

import type { StrapiApp } from '@strapi/admin/strapi-admin';
import type {
  BulkActionComponent,
  ContentManagerPlugin,
  DocumentActionComponent,
} from '@strapi/content-manager/strapi-admin';

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

/** Extension points exposed by i18n's admin (see i18n's `admin/src/i18n-plugin.ts`). */
type I18nSpacesApis = {
  registerLocaleFormExtension?: (extension: {
    id: string;
    Component: typeof LocaleSpacesFormSection;
    getInitialValues?: (locale?: unknown) => Record<string, unknown>;
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

    // The switcher lives in the main navigation, right above the user avatar.
    registerMainNavAddon({ id: 'spaces-switcher', Component: SpaceSwitcher });

    // Hide the Settings sections a workspace isn't entitled to (capabilities).
    registerSettingsMenuMutator({
      id: 'spaces-capabilities',
      useMutator: useWorkspaceSettingsMenuMutator,
    });

    // The Content-Type Builder only exists in the default workspace.
    registerMenuMutator({
      id: 'spaces-ctb-default-only',
      useMutator: useWorkspaceMainMenuMutator,
    });

    // Role ↔ workspace association on the role edit page (default workspace
    // only — see RoleWorkspacesField). The `spaces` value rides the role
    // update body; the server-side wrapper extracts it and writes the M2M.
    registerRoleFormExtension({
      id: 'spaces-role-workspaces',
      field: 'spaces',
      Component: RoleWorkspacesField,
      getInitialValue: getRoleWorkspacesInitialValue,
    });

    // API token ↔ workspace binding on the token create/edit page (default
    // workspace only). Enforced at auth level server-side: a bound token
    // cannot leave its workspaces whatever header the caller sends.
    registerTokenFormExtension({
      id: 'spaces-token-workspaces',
      field: 'spaces',
      Component: TokenWorkspacesField,
      getInitialValue: getTokenWorkspacesInitialValue,
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
      const ctbFormsAPI = ctbPlugin.apis.forms as ContentTypeBuilderFormsAPI;

      ctbFormsAPI.components.add({ id: 'spaces-workspaces', component: SpaceVisibility });

      ctbFormsAPI.extendContentType({
        // `scope` stays accepted so schemas that set entry partitioning in
        // schema.json survive a CTB save; the form only exposes the
        // workspaces dropdown.
        validator: () => ({
          spaces: yup.object().shape({
            scope: yup.string().oneOf(['space', 'platform']),
            visibleIn: yup.array().of(yup.string()),
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
            ];
          },
        },
      });
    }

    /* ------------------------------ i18n -------------------------------- */

    const i18nPlugin = app.getPlugin('i18n');

    if (i18nPlugin) {
      const i18nApis = i18nPlugin.apis as I18nSpacesApis;

      i18nApis.registerLocaleFormExtension?.({
        id: 'spaces-visibility',
        Component: LocaleSpacesFormSection,
        getInitialValues: getLocaleSpacesInitialValues,
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
