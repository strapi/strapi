import { registerDocumentRenderContext } from '@strapi/content-manager/strapi-admin';
import get from 'lodash/get';
import * as yup from 'yup';

import { ChannelHeaderAction } from './components/ChannelHeaderAction';
import { ChannelPicker } from './components/ChannelPicker';
import { FillFromChannelAction } from './components/FillFromChannelAction';
import { ResetOverridesAction } from './components/ResetOverridesAction';
import { ChannelVisibilityField } from './components/ChannelVisibilityField';
import { PERMISSIONS } from './constants';
import { mutateEditViewHook } from './contentManagerHooks/editView';
import { PLUGIN_ID } from './pluginId';
import { installChannelHeaderInterceptor } from './utils/fetchInterceptor';
import { OVERRIDABLE_FIELDS } from './utils/fields';
import { getTranslation } from './utils/getTranslation';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';
import { useCurrentChannelSlug } from './utils/useSwitchChannel';

import type { StrapiApp } from '@strapi/admin/strapi-admin';
import type {
  ContentManagerPlugin,
  DocumentActionComponent,
  HeaderActionComponent,
} from '@strapi/content-manager/strapi-admin';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: StrapiApp) {
    // Every backend request from the admin carries the active channel from now on.
    installChannelHeaderInterceptor();

    // A channel switch must re-decorate the edit-view layout and remount the
    // form even though the channel lives in localStorage, not the URL.
    registerDocumentRenderContext({
      id: PLUGIN_ID,
      useValue: useCurrentChannelSlug,
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });
  },
  bootstrap(app: StrapiApp) {
    const contentManager = app.getPlugin('content-manager');
    if (contentManager) {
      const apis = contentManager.apis as ContentManagerPlugin['config']['apis'];

      // Channel picker in the list view toolbar (same zone as the locale
      // picker), pinned FIRST whatever the plugins' bootstrap order: the
      // injection zone getter is patched at render time, the same pattern as
      // the spaces plugin's action guards.
      contentManager.injectComponent('listView', 'actions', {
        name: 'channels-picker',
        Component: ChannelPicker,
      });
      const getInjectedComponents = contentManager.getInjectedComponents.bind(contentManager);
      contentManager.getInjectedComponents = (containerName: string, blockName: string) => {
        const components = getInjectedComponents(containerName, blockName);
        if (containerName === 'listView' && blockName === 'actions') {
          return [...components].sort((a, b) =>
            a.name === 'channels-picker' ? -1 : b.name === 'channels-picker' ? 1 : 0
          );
        }
        return components;
      };

      // …and FIRST in the edit view header (same seam as i18n's locale picker).
      apis.addDocumentHeaderAction((actions: HeaderActionComponent[]) => [
        ChannelHeaderAction,
        ...actions,
      ]);

      // "Reset overrides (channel)" in the document's ··· menu — the way back
      // to the Default values, without adding a side-panel block.
      apis.addDocumentAction((actions: DocumentActionComponent[]) => [
        ...actions,
        FillFromChannelAction,
        ResetOverridesAction,
      ]);

      // Per-field decoration: hidden / disabled / override badge per channel.
      app.registerHook('Admin/CM/pages/EditView/mutate-edit-view-layout', mutateEditViewHook);
    }

    app.addSettingsLink('global', {
      intlLabel: { id: getTranslation('settings.title'), defaultMessage: 'Channels' },
      id: PLUGIN_ID,
      to: 'channels',
      Component: () =>
        import('./pages/SettingsPage').then((mod) => ({ default: mod.ProtectedSettingsPage })),
      permissions: PERMISSIONS.read,
    });

    const ctbPlugin = app.getPlugin('content-type-builder');
    if (ctbPlugin) {
      const ctbApis = ctbPlugin.apis as {
        forms: {
          components: { add: (input: { id: string; component: unknown }) => void };
          extendContentType: (data: unknown) => void;
          extendFields: (fields: string[], data: unknown) => void;
        };
        registerAttributeFlag?: (flag: {
          id: string;
          label: { id: string; defaultMessage: string };
          short: { id: string; defaultMessage: string };
          tone: string;
          applies: (attribute: Record<string, unknown>) => boolean;
        }) => void;
      };

      ctbApis.forms.components.add({
        id: 'channels-visibility',
        component: ChannelVisibilityField,
      });

      ctbApis.forms.extendContentType({
        validator: () => ({
          channels: yup.object().shape({
            enabled: yup.bool(),
          }),
        }),
        form: {
          advanced() {
            return [
              {
                name: 'pluginOptions.channels.enabled',
                type: 'checkbox',
                intlLabel: {
                  id: getTranslation('ctb.enabled.label'),
                  defaultMessage: 'Channel variants',
                },
                description: {
                  id: getTranslation('ctb.enabled.description'),
                  defaultMessage:
                    'Fields marked overridable can carry a different value per delivery channel',
                },
              },
            ];
          },
        },
      });

      ctbApis.forms.extendFields(OVERRIDABLE_FIELDS, {
        form: {
          advanced({
            contentTypeSchema,
            forTarget,
            type,
            step,
          }: {
            contentTypeSchema: unknown;
            forTarget: string;
            type: string;
            step: string | null;
          }) {
            if (forTarget !== 'contentType') {
              return [];
            }
            if (!get(contentTypeSchema, ['pluginOptions', 'channels', 'enabled'], false)) {
              return [];
            }
            if (type === 'component' && step === '1') {
              return [];
            }

            return [
              {
                name: 'pluginOptions.channels.overridable',
                type: 'checkbox',
                intlLabel: {
                  id: getTranslation('ctb.overridable.label'),
                  defaultMessage: 'The value can vary by channel',
                },
                description: {
                  id: getTranslation('ctb.overridable.description'),
                  defaultMessage: 'Unchecked, the field keeps the same value on every channel',
                },
              },
              {
                name: 'pluginOptions.channels.visibleIn',
                type: 'channels-visibility',
                size: 12,
                intlLabel: {
                  id: getTranslation('ctb.visible-in.label'),
                  defaultMessage: 'Visible in channels',
                },
                description: {
                  id: getTranslation('ctb.visible-in.description'),
                  defaultMessage:
                    'The field is stripped from API responses and hidden in the admin on unchecked channels.',
                },
              },
            ];
          },
        },
      });

      ctbApis.registerAttributeFlag?.({
        id: PLUGIN_ID,
        label: { id: getTranslation('ctb.flag.label'), defaultMessage: 'Channels' },
        short: { id: getTranslation('ctb.flag.short'), defaultMessage: 'Per channel' },
        tone: 'secondary',
        applies: (attribute) =>
          (attribute.pluginOptions as { channels?: { overridable?: boolean } } | undefined)
            ?.channels?.overridable === true,
      });
    }
  },
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, PLUGIN_ID),
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
