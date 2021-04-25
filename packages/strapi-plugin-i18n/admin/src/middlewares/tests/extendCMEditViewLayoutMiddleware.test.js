import React from 'react';
import { Globe, GlobeCrossed } from '@buffetjs/icons';
import { getTrad } from '../../utils';
import extendCMEditViewLayoutMiddleware, {
  enhanceComponentsLayout,
  enhanceEditLayout,
  enhanceRelationLayout,
} from '../extendCMEditViewLayoutMiddleware';

const localizedTrad = getTrad('Field.localized');
const localizedTradDefaultMessage = 'This value is unique for the selected locale';
const notLocalizedTrad = getTrad('Field.not-localized');
const notLocalizedTradDefaultMessage = 'This value is common to all locales';

describe('i18n | Middlewares | extendCMEditViewLayoutMiddleware', () => {
  it('should forward the action if the type is undefined', () => {
    const middleware = extendCMEditViewLayoutMiddleware();
    const action = { test: true, type: undefined };

    const next = jest.fn();

    middleware()(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('should forward if the type is not correct', () => {
    const middleware = extendCMEditViewLayoutMiddleware();
    const action = { test: true, type: 'TEST' };

    const next = jest.fn();

    middleware()(next)(action);

    expect(next).toBeCalledWith(action);
  });

  describe('should forward when the type is ContentManager/EditViewLayoutManager/SET_LAYOUT', () => {
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
      const action = {
        type: 'ContentManager/EditViewLayoutManager/SET_LAYOUT',
        layout,
      };
      const middleware = extendCMEditViewLayoutMiddleware();
      const next = jest.fn();

      middleware()(next)(action);

      expect(next).toBeCalledWith(action);
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

      const action = {
        type: 'ContentManager/EditViewLayoutManager/SET_LAYOUT',
        layout,
      };
      const middleware = extendCMEditViewLayoutMiddleware();

      const next = jest.fn();
      middleware()(next)(action);

      expect(next).toBeCalledWith(action);
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

      const action = {
        type: 'ContentManager/EditViewLayoutManager/SET_LAYOUT',
        layout,
        query: { plugins: { i18n: { locale: 'en' } } },
      };
      const middleware = extendCMEditViewLayoutMiddleware();

      const next = jest.fn();
      middleware()(next)(action);

      expect(next).toBeCalledWith({
        ...action,
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
                  labelIcon: {
                    title: { id: localizedTrad, defaultMessage: localizedTradDefaultMessage },
                    icon: <Globe />,
                  },
                },
              ],
            },
          },
        },
      });
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
                    defaultParams: { test: true, _locale: 'en' },
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
                    defaultParams: { test: true, _locale: 'en' },
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
            labelIcon: {
              title: { id: localizedTrad, defaultMessage: localizedTradDefaultMessage },
              icon: <Globe />,
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
            labelIcon: {
              title: { id: localizedTrad, defaultMessage: localizedTradDefaultMessage },
              icon: <Globe />,
            },
          },
          {
            name: 'slug',
            size: 6,
            fieldSchema: {
              type: 'uid',
            },
            labelIcon: {
              title: { id: localizedTrad, defaultMessage: localizedTradDefaultMessage },
              icon: <Globe />,
            },
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
            labelIcon: {
              title: { id: localizedTrad, defaultMessage: localizedTradDefaultMessage },
              icon: <Globe />,
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
            labelIcon: {
              title: { id: notLocalizedTrad, defaultMessage: notLocalizedTradDefaultMessage },
              icon: <GlobeCrossed />,
            },
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
          labelIcon: {
            title: { id: localizedTrad, defaultMessage: localizedTradDefaultMessage },
            icon: <Globe />,
          },
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
              _locale: 'en',
            },
            paramsToKeep: ['plugins.i18n.locale'],
          },
          size: 6,
          targetModelPluginOptions: {
            i18n: { localized: true },
          },
          labelIcon: {
            title: { id: localizedTrad, defaultMessage: localizedTradDefaultMessage },
            icon: <Globe />,
          },
        },
      ];

      expect(enhanceRelationLayout(editRelations, 'en')).toEqual(expected);
    });
  });
});
