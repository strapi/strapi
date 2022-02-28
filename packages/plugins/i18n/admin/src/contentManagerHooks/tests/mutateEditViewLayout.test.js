import React from 'react';
import I18N from '@strapi/icons/Earth';
import StrikedWorld from '@strapi/icons/EarthStriked';
import LabelAction from '../../components/LabelAction';
import { getTrad } from '../../utils';
import mutateEditViewLayout, {
  enhanceComponentsLayout,
  enhanceEditLayout,
  enhanceRelationLayout,
} from '../mutateEditViewLayout';

const localizedTrad = getTrad('Field.localized');
const localizedTradDefaultMessage = 'This value is unique for the selected locale';
const notLocalizedTrad = getTrad('Field.not-localized');
const notLocalizedTradDefaultMessage = 'This value is common to all locales';

describe('i18n | contentManagerHooks | mutateEditViewLayout', () => {
  it('should forward when i18n is not enabled on the content type', () => {
    const layout = {
      components: {},
      contentType: {
        uid: 'test',
        pluginOptions: { i18n: { localized: false } },
        layouts: {
          edit: ['test'],
        },
      },
    };
    const data = {
      layout,
      query: null,
    };
    const results = mutateEditViewLayout(data);

    expect(results).toEqual(data);
  });

  it('should forward the action when i18n is enabled and the query.locale is not defined', () => {
    const layout = {
      contentType: {
        uid: 'test',
        pluginOptions: { i18n: { localized: true } },
        layouts: {
          edit: [],
          editRelations: [
            {
              fieldSchema: {},
              metadatas: {},
              name: 'addresses',
              queryInfos: {},
              size: 6,
              targetModelPluginOptions: {},
            },
          ],
        },
      },
    };

    const data = {
      query: null,
      layout,
    };
    const results = mutateEditViewLayout(data);

    expect(results).toEqual(data);
  });

  it('should modify the editRelations layout when i18n is enabled and the query.locale is defined', () => {
    const layout = {
      contentType: {
        uid: 'test',
        pluginOptions: { i18n: { localized: true } },
        layouts: {
          edit: [],
          editRelations: [
            {
              fieldSchema: {},
              metadatas: {},
              name: 'addresses',
              queryInfos: {
                test: true,
                defaultParams: {},
                paramsToKeep: ['plugins.i18n.locale'],
              },
              size: 6,
              targetModelPluginOptions: {},
            },
          ],
        },
      },
      components: {},
    };

    const data = {
      layout,
      query: { plugins: { i18n: { locale: 'en' } } },
    };
    const results = mutateEditViewLayout(data);

    expect(results).toEqual({
      ...data,
      layout: {
        ...layout,
        contentType: {
          ...layout.contentType,
          layouts: {
            edit: [],
            editRelations: [
              {
                fieldSchema: {},
                metadatas: {},
                name: 'addresses',
                queryInfos: {
                  test: true,
                  defaultParams: {},
                  paramsToKeep: ['plugins.i18n.locale'],
                },
                size: 6,
                targetModelPluginOptions: {},
                labelAction: (
                  <LabelAction
                    title={{ id: localizedTrad, defaultMessage: localizedTradDefaultMessage }}
                    icon={<I18N aria-hidden />}
                  />
                ),
              },
            ],
          },
        },
      },
    });
  });

  describe('enhanceComponentsLayout', () => {
    it('should not enhance the field when the type is not relation', () => {
      const components = {
        test: {
          test: true,
          layouts: {
            edit: [
              [
                {
                  name: 'title',
                  fieldSchema: { type: 'string' },
                },
                {
                  name: 'content',
                  fieldSchema: { type: 'string' },
                },
              ],
            ],
          },
        },
      };
      const expected = {
        test: {
          test: true,
          layouts: {
            edit: [
              [
                {
                  name: 'title',
                  fieldSchema: { type: 'string' },
                },
                {
                  name: 'content',
                  fieldSchema: { type: 'string' },
                },
              ],
            ],
          },
        },
      };

      expect(enhanceComponentsLayout(components)).toEqual(expected);
    });

    it('should not enhance the field when the type is relation and the targetModel.pluginOptions.i18.localized is disabled', () => {
      const components = {
        test: {
          test: true,
          layouts: {
            edit: [
              [
                {
                  name: 'title',
                  fieldSchema: { type: 'relation' },
                  targetModelPluginOptions: { i18n: { localized: false } },
                },
                {
                  name: 'content',
                  fieldSchema: { type: 'string' },
                },
              ],
            ],
          },
        },
      };
      const expected = {
        test: {
          test: true,
          layouts: {
            edit: [
              [
                {
                  name: 'title',
                  fieldSchema: { type: 'relation' },
                  targetModelPluginOptions: { i18n: { localized: false } },
                },
                {
                  name: 'content',
                  fieldSchema: { type: 'string' },
                },
              ],
            ],
          },
        },
      };

      expect(enhanceComponentsLayout(components)).toEqual(expected);
    });

    it('should modify the relation field when the targetModelPluginOptions.i18n.localized is enabled', () => {
      const components = {
        foo: {
          test: true,
          layouts: {
            edit: [
              [
                {
                  name: 'title',
                  fieldSchema: { type: 'relation' },
                  targetModelPluginOptions: { i18n: { localized: true } },
                  queryInfos: {
                    defaultParams: { test: true },
                  },
                },
                {
                  name: 'content',
                  fieldSchema: { type: 'string' },
                },
              ],
            ],
          },
        },
        bar: {
          test: true,
          layouts: {
            edit: [
              [
                {
                  name: 'title',
                  fieldSchema: { type: 'relation' },
                  targetModelPluginOptions: { i18n: { localized: true } },
                  queryInfos: {
                    defaultParams: { test: true },
                  },
                },
                {
                  name: 'content',
                  fieldSchema: { type: 'string' },
                },
              ],
            ],
          },
        },
      };
      const expected = {
        foo: {
          test: true,
          layouts: {
            edit: [
              [
                {
                  name: 'title',
                  fieldSchema: { type: 'relation' },
                  targetModelPluginOptions: { i18n: { localized: true } },
                  queryInfos: {
                    defaultParams: { test: true, locale: 'en' },
                    paramsToKeep: ['plugins.i18n.locale'],
                  },
                },
                {
                  name: 'content',
                  fieldSchema: { type: 'string' },
                },
              ],
            ],
          },
        },
        bar: {
          test: true,
          layouts: {
            edit: [
              [
                {
                  name: 'title',
                  fieldSchema: { type: 'relation' },
                  targetModelPluginOptions: { i18n: { localized: true } },
                  queryInfos: {
                    defaultParams: { test: true, locale: 'en' },
                    paramsToKeep: ['plugins.i18n.locale'],
                  },
                },
                {
                  name: 'content',
                  fieldSchema: { type: 'string' },
                },
              ],
            ],
          },
        },
      };

      expect(enhanceComponentsLayout(components, 'en')).toEqual(expected);
    });
  });

  describe('enhanceEditLayout', () => {
    it('should add the label icon to all fields with the localized translation when i18n is enabled', () => {
      const edit = [
        [
          {
            name: 'name',
            size: 6,
            fieldSchema: {
              pluginOptions: { i18n: { localized: true } },
              type: 'string',
            },
          },
        ],
        [
          {
            name: 'test',
            size: 6,
            fieldSchema: {
              pluginOptions: { i18n: { localized: true } },
              type: 'string',
            },
          },
          {
            name: 'slug',
            size: 6,
            fieldSchema: {
              type: 'uid',
            },
          },
        ],
      ];
      const expected = [
        [
          {
            name: 'name',
            size: 6,
            fieldSchema: {
              pluginOptions: { i18n: { localized: true } },
              type: 'string',
            },
            labelAction: (
              <LabelAction
                title={{ id: localizedTrad, defaultMessage: localizedTradDefaultMessage }}
                icon={<I18N aria-hidden />}
              />
            ),
          },
        ],
        [
          {
            name: 'test',
            size: 6,
            fieldSchema: {
              pluginOptions: { i18n: { localized: true } },
              type: 'string',
            },
            labelAction: (
              <LabelAction
                title={{ id: localizedTrad, defaultMessage: localizedTradDefaultMessage }}
                icon={<I18N aria-hidden />}
              />
            ),
          },
          {
            name: 'slug',
            size: 6,
            fieldSchema: {
              type: 'uid',
            },
            labelAction: (
              <LabelAction
                title={{ id: localizedTrad, defaultMessage: localizedTradDefaultMessage }}
                icon={<I18N aria-hidden />}
              />
            ),
          },
        ],
      ];

      expect(enhanceEditLayout(edit)).toEqual(expected);
    });

    it('should add the label icon to all fields with the not localized translation when i18n is disabled', () => {
      const edit = [
        [
          {
            name: 'name',
            size: 6,
            fieldSchema: {
              pluginOptions: { i18n: { localized: true } },
              type: 'string',
            },
          },
        ],
        [
          {
            name: 'test',
            size: 6,
            fieldSchema: {
              pluginOptions: { i18n: { localized: false } },
              type: 'string',
            },
          },
        ],
      ];
      const expected = [
        [
          {
            name: 'name',
            size: 6,
            fieldSchema: {
              pluginOptions: { i18n: { localized: true } },
              type: 'string',
            },
            labelAction: (
              <LabelAction
                title={{ id: localizedTrad, defaultMessage: localizedTradDefaultMessage }}
                icon={<I18N aria-hidden />}
              />
            ),
          },
        ],
        [
          {
            name: 'test',
            size: 6,
            fieldSchema: {
              pluginOptions: { i18n: { localized: false } },
              type: 'string',
            },
            labelAction: (
              <LabelAction
                title={{ id: notLocalizedTrad, defaultMessage: notLocalizedTradDefaultMessage }}
                icon={<StrikedWorld aria-hidden />}
              />
            ),
          },
        ],
      ];

      expect(enhanceEditLayout(edit)).toEqual(expected);
    });
  });

  describe('enhanceRelationLayout', () => {
    it('should add the labelIcon key to all relations fields', () => {
      const editRelations = [
        {
          fieldSchema: {},
          metadatas: {},
          name: 'addresses',
          queryInfos: {},
          size: 6,
          targetModelPluginOptions: {},
        },
      ];
      const expected = [
        {
          fieldSchema: {},
          metadatas: {},
          name: 'addresses',
          queryInfos: {},
          size: 6,
          targetModelPluginOptions: {},
          labelAction: (
            <LabelAction
              title={{ id: localizedTrad, defaultMessage: localizedTradDefaultMessage }}
              icon={<I18N aria-hidden />}
            />
          ),
        },
      ];

      expect(enhanceRelationLayout(editRelations, 'en')).toEqual(expected);
    });

    it('should add the locale to the queryInfos.defaultParams when the targetModelPluginOptions.i18n.localized is enabled', () => {
      const editRelations = [
        {
          fieldSchema: {},
          metadatas: {},
          name: 'addresses',
          queryInfos: {
            defaultParams: {
              test: true,
            },
          },
          size: 6,
          targetModelPluginOptions: {
            i18n: { localized: true },
          },
        },
      ];
      const expected = [
        {
          fieldSchema: {},
          metadatas: {},
          name: 'addresses',
          queryInfos: {
            defaultParams: {
              test: true,
              locale: 'en',
            },
            paramsToKeep: ['plugins.i18n.locale'],
          },
          size: 6,
          targetModelPluginOptions: {
            i18n: { localized: true },
          },
          labelAction: (
            <LabelAction
              title={{ id: localizedTrad, defaultMessage: localizedTradDefaultMessage }}
              icon={<I18N aria-hidden />}
            />
          ),
        },
      ];

      expect(enhanceRelationLayout(editRelations, 'en')).toEqual(expected);
    });
  });
});
