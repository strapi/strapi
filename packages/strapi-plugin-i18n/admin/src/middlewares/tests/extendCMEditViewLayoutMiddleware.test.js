import React from 'react';
import { Globe, GlobeCrossed } from '@buffetjs/icons';
import { getTrad } from '../../utils';
import extendCMEditViewLayoutMiddleware, {
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

    it('should modify the editRelations layout when i18n is enabled', () => {
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
                  queryInfos: {},
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

      expect(enhanceRelationLayout(editRelations)).toEqual(expected);
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
});
