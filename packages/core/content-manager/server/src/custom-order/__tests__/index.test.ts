import type { Core, Struct } from '@strapi/types';

import { FUTURE_FLAG, POSITION_ATTRIBUTE } from '../constants';
import customOrder from '..';

const ARTICLE_UID = 'api::article.article';
const HIDDEN_UID = 'api::hidden.hidden';
const SINGLE_UID = 'api::homepage.homepage';

const createStrapi = ({ isFeatureEnabled = true } = {}) => {
  const extend = jest.fn();
  const bootstrap = jest.fn(async () => {});
  const isEnabled = jest.fn((flag: string) => flag === FUTURE_FLAG && isFeatureEnabled);

  const strapi = {
    features: { future: { isEnabled } },
    contentTypes: {
      [ARTICLE_UID]: { uid: ARTICLE_UID, kind: 'collectionType', attributes: {} },
      [HIDDEN_UID]: {
        uid: HIDDEN_UID,
        kind: 'collectionType',
        attributes: {},
        pluginOptions: { 'content-manager': { visible: false } },
      },
      [SINGLE_UID]: { uid: SINGLE_UID, kind: 'singleType', attributes: {} },
    },
    get: jest.fn((name: string) => {
      if (name === 'content-types') {
        return { extend };
      }

      throw new Error(`Unexpected registry ${name}`);
    }),
    service: jest.fn((name: string) => {
      if (name === 'plugin::content-manager.custom-order') {
        return { bootstrap };
      }

      throw new Error(`Unexpected service ${name}`);
    }),
  };

  return { strapi: strapi as any, extend, bootstrap, isEnabled };
};

describe('Custom order feature', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('Does nothing while the feature flag is off', () => {
      const { strapi, isEnabled } = createStrapi({ isFeatureEnabled: false });

      customOrder.register!({ strapi });

      expect(isEnabled).toHaveBeenCalledWith(FUTURE_FLAG);
      expect(strapi.get).not.toHaveBeenCalled();
    });

    test('Adds the position attribute to the collection types shown in the Content Manager', () => {
      const { strapi, extend } = createStrapi();

      customOrder.register!({ strapi });

      expect(extend).toHaveBeenCalledTimes(1);
      expect(extend).toHaveBeenCalledWith(ARTICLE_UID, expect.any(Function));

      const schema = { uid: ARTICLE_UID, attributes: { title: { type: 'string' } } };
      extend.mock.calls[0][1](schema as unknown as Struct.ContentTypeSchema);

      expect(schema.attributes).toEqual({
        title: { type: 'string' },
        [POSITION_ATTRIBUTE]: {
          type: 'integer',
          configurable: false,
          visible: false,
          writable: true,
          private: true,
        },
      });
    });
  });

  describe('bootstrap', () => {
    test('Does nothing while the feature flag is off', async () => {
      const { strapi, bootstrap } = createStrapi({ isFeatureEnabled: false });

      await customOrder.bootstrap!({ strapi });

      expect(bootstrap).not.toHaveBeenCalled();
    });

    test('Starts the custom order service', async () => {
      const { strapi, bootstrap } = createStrapi();

      await customOrder.bootstrap!({ strapi });

      expect(bootstrap).toHaveBeenCalledTimes(1);
    });
  });

  test('Exposes its controllers, services and routes', () => {
    expect(Object.keys(customOrder.controllers!)).toEqual(['custom-order']);
    expect(Object.keys(customOrder.services!)).toEqual(['custom-order']);

    const router = customOrder.routes!['custom-order'] as Core.Router;
    expect(router.type).toBe('admin');
    expect(router.routes).toEqual([
      expect.objectContaining({
        method: 'POST',
        path: '/collection-types/:model/:id/actions/move',
        handler: 'custom-order.move',
      }),
    ]);
  });
});
