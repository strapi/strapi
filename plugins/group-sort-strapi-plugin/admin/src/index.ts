import { GROUPABLE_FIELDS, ORDERABLE_2D_FIELDS, ORDERABLE_FIELDS, PLUGIN_ID, UNDEFINED_GROUP_NAME } from '../../shared/constants';
import { Initializer } from './components/Initializer';
import { PluginIcon, OrderIcon } from './components/PluginIcon';
import { Schema } from '@strapi/strapi';
import { StrapiApp } from '@strapi/strapi/admin';
import * as yup from 'yup';
import { getTrad } from './hooks/useTranslation';

const fieldValidator: () => Record<string, yup.AnySchema> =  () => ({
  group: yup.object().shape({
    groupNameField: yup
      .string()
      .not([UNDEFINED_GROUP_NAME, 'null']),
    columnsNumber: yup.number().required().integer().min(1).max(100),
    order2dDirection: yup.string().nullable(),
  }),
});

export default {
  register(app: StrapiApp) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: getTrad('plugin.name'),
        defaultMessage: PLUGIN_ID,
      },
      // @ts-ignore
      Component: async () => {
        const { App } = await import('./pages/App');

        return App;
      },
    });
    
    app.addSettingsLink('global', {
      intlLabel: {
        id: getTrad('plugin.name'),
        defaultMessage: 'Internationalization',
      },
      id: 'sorting',
      to: 'group-and-arrange',
      Component: () =>
        import('./pages/SettingsPage').then((mod) => ({ default: mod.SettingsPage })),
      permissions: [],
    });

    app.customFields.register({
      name: 'order',
      type: 'integer',
      pluginId: PLUGIN_ID,
      intlLabel: {
        id: getTrad('order.label'),
        defaultMessage: 'Order',
      },
      intlDescription: {
        id: getTrad('order.description'),
        defaultMessage: 'Order within the group',
      },
      icon: OrderIcon,
      components: {
        Input: () => import('./components/contentManager/OrderInput')
      },
      options: {
        validator: fieldValidator,
      }
    });
    
    app.customFields.register({
      name: 'order2d',
      type: 'json',
      pluginId: PLUGIN_ID,
      intlLabel: {
        id: getTrad('order-2d.label'),
        defaultMessage: 'Order 2D',
      },
      intlDescription: {
        id: getTrad('order-2d.description'),
        defaultMessage: 'Position on 2D grid within the group',
      },
      icon: OrderIcon,
      components: {
        Input: () => import('./components/contentManager/Order2dInput')
      },
      options: {
        validator: fieldValidator
      }
    });
    
    app.customFields.register({
      name: 'orderMultiline',
      type: 'json',
      pluginId: PLUGIN_ID,
      intlLabel: {
        id: getTrad('order-multiline.label'),
        defaultMessage: 'Multiline order',
      },
      intlDescription: {
        id: getTrad('order-multiline.description'),
        defaultMessage: 'Line number and position on line within the group',
      },
      icon: OrderIcon,
      components: {
        Input: () => import('./components/contentManager/OrderMultilineInput')
      },
      options: {
        validator: fieldValidator
      }
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  bootstrap(app: any) {
    
    const ctbPlugin = app.getPlugin('content-type-builder');

    if (ctbPlugin) {
      const ctbFormsAPI = ctbPlugin.apis.forms;
      ctbFormsAPI.addContentTypeSchemaMutation((
        nextSchema: Schema.ContentType,
        prevSchema?: {
          apiID?: string;
          schema?: Schema.ContentType;
          uid?: string;
        }
      ) => {
        return nextSchema;
      });
      
      ctbFormsAPI.extendFields(ORDERABLE_FIELDS, {
        form: {
          advanced(params: any) {
            const { contentTypeSchema, forTarget, type, step } = params;
            if (forTarget !== 'contentType') {
              return [];
            }

            if (type === 'component' && step === '1') {
              return [];
            }

            const isOrder2d = ORDERABLE_2D_FIELDS.includes(type);
            const isOrderMultiline = isOrder2d;

            const availableOptions = contentTypeSchema.schema.attributes
              .filter((attr: any) => GROUPABLE_FIELDS.includes(attr.type))
              .map((attr: any) => ({
                key: attr.name,
                value: attr.name,
                metadatas: {
                  intlLabel: {
                    id: `${PLUGIN_ID}.dummy`,
                    defaultMessage: attr.name,
                  },
                  disabled: false,
                  hidden: false,
                },
              }));
            availableOptions.push({
                key: '',
                value: '',
                metadatas: {
                  intlLabel: {
                    id: getTrad('pluginOptions.group.noGroup'),
                    defaultMessage: '<Self>',
                  },
                  disabled: false,
                  hidden: false,
                },
              });

            const moreFields: any[] = [];
            if(isOrder2d) {
              moreFields.push({
                name: 'options.group.order2dDirection',
                type: 'select',
                options: [
                  {
                    key: '',
                    value: '',
                    metadatas: {
                      intlLabel: {
                        id: getTrad('content-field-editor.group.order2d.direction.value.none'),
                        defaultMessage: '<None>',
                      },
                      disabled: false,
                      hidden: false,
                    },
                  },
                  {
                    key: 'horizontal',
                    value: 'horizontal',
                    metadatas: {
                      intlLabel: {
                        id: getTrad('content-field-editor.group.order2d.direction.value.horizontal'),
                        defaultMessage: 'Horizontal',
                      },
                      disabled: false,
                      hidden: false,
                    },
                  },
                  {
                    key: 'vertical',
                    value: 'vertical',
                    metadatas: {
                      intlLabel: {
                        id: getTrad('content-field-editor.group.order2d.direction.value.vertical'),
                        defaultMessage: 'Vertical',
                      },
                      disabled: false,
                      hidden: false,
                    },
                  },
                ],
                intlLabel: {
                  id: getTrad('content-field-editor.group.order2d.direction.label'),
                  defaultMessage: 'Order 2D direction',
                },
                description: {
                  id: getTrad('content-field-editor.group.order2d.direction.description'),
                  defaultMessage: 'Direction of the order 2D',
                },
              });
            }

            return [
              {
                name: 'options.group.groupNameField',
                type: 'select',
                options: availableOptions,
                intlLabel: {
                  id: getTrad('content-field-editor.group.label'),
                  defaultMessage: 'Grouping field',
                },
                description: {
                  id: getTrad('content-field-editor.group.description'),
                  defaultMessage: 'Field which will be used to group entries in "Group and Arrange" view',
                },
              },
              {
                name: 'options.group.columnsNumber',
                type: 'number',
                intlLabel: {
                  id: getTrad('content-field-editor.layout-columns.label'),
                  defaultMessage: 'Columns',
                },
                description: {
                  id: getTrad('content-field-editor.layout-columns.description'),
                  defaultMessage: 'Number of columns in \"Sort\" view',
                },
              },
              ...moreFields
            ];
          }
        },
      });
    }
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);

          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
