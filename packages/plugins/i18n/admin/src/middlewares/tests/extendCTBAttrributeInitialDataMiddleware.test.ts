import { extendCTBAttributeInitialDataMiddleware } from '../extendCTBAttributeInitialData';

describe('i18n | middlewares | extendCTBAttributeInitialDataMiddleware', () => {
  it('should forward the action if the type is undefined', () => {
    const middleware = extendCTBAttributeInitialDataMiddleware();
    const action = { test: true, type: undefined };
    const getState = jest.fn();

    const next = jest.fn();

    // @ts-expect-error – mocked store
    middleware({ getState })(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('should forward if the type is not correct', () => {
    const middleware = extendCTBAttributeInitialDataMiddleware();
    const action = { test: true, type: 'TEST' };
    const getState = jest.fn();

    const next = jest.fn();

    // @ts-expect-error – mocked store
    middleware({ getState })(next)(action);

    expect(next).toBeCalledWith(action);
  });

  describe('should forward when the type is ContentTypeBuilder/FormModal/SET_ATTRIBUTE_DATA_SCHEMA', () => {
    it('should forward if the forTarget is not contentType', () => {
      const middleware = extendCTBAttributeInitialDataMiddleware();
      const action = {
        type: 'formModal/setAttributeDataSchema',
        payload: {
          uid: 'api::test.test',
        },
      };
      const getState = jest.fn();

      const next = jest.fn();

      // @ts-expect-error – mocked store
      middleware({ getState })(next)(action);

      expect(next).toBeCalledWith(action);
    });

    it('should forward if the i18n is not activated is not contentType', () => {
      const middleware = extendCTBAttributeInitialDataMiddleware();
      const action = {
        type: 'formModal/setAttributeDataSchema',
        payload: { attributeType: 'text', uid: 'api::test.test' },
      };

      const getState = jest.fn(() => ({
        'content-type-builder_dataManagerProvider': {
          current: {
            contentTypes: {
              'api::test.test': { pluginOptions: { i18n: { localized: false } } },
            },
          },
        },
      }));

      const next = jest.fn();

      // @ts-expect-error – mocked store
      middleware({ getState })(next)(action);

      expect(next).toBeCalledWith(action);
    });

    it('should forward if the ctb is not mounted', () => {
      const middleware = extendCTBAttributeInitialDataMiddleware();
      const action = {
        type: 'formModal/setAttributeDataSchema',
        payload: { attributeType: 'text', uid: 'api::test.test' },
      };

      const getState = jest.fn(() => ({
        'content-type-builder_dataManagerProvider': undefined,
      }));

      const next = jest.fn();

      // @ts-expect-error – mocked store
      middleware({ getState })(next)(action);

      expect(next).toBeCalledWith(action);
    });
  });

  it('should add the action.pluginOptions if the type is correct and i18n is activated', () => {
    const middleware = extendCTBAttributeInitialDataMiddleware();
    const action = {
      type: 'formModal/setAttributeDataSchema',
      payload: {
        attributeType: 'text',
        uid: 'api::test.test',
      },
    };

    const getState = jest.fn(() => ({
      'content-type-builder_dataManagerProvider': {
        // i18n is activated
        current: {
          contentTypes: {
            'api::test.test': {
              modelType: 'contentType',
              pluginOptions: { i18n: { localized: true } },
            },
          },
        },
      },
    }));

    const next = jest.fn();

    // @ts-expect-error – mocked store
    middleware({ getState })(next)(action);

    expect(next).toBeCalledWith({
      ...action,
      payload: {
        ...action.payload,
        options: { pluginOptions: { i18n: { localized: true } } },
      },
    });
  });

  it('should modify the options.pluginOptions when it exists', () => {
    const middleware = extendCTBAttributeInitialDataMiddleware();
    const action = {
      type: 'formModal/resetPropsAndSetFormForAddingAnExistingCompo',
      payload: {
        options: { pluginOptions: { pluginTest: { ok: true } } },
        uid: 'api::test.test',
      },
    };

    const getState = jest.fn(() => ({
      'content-type-builder_dataManagerProvider': {
        // i18n is activated
        current: {
          contentTypes: {
            'api::test.test': {
              modelType: 'contentType',
              pluginOptions: { i18n: { localized: true } },
            },
          },
        },
      },
    }));

    const next = jest.fn();

    // @ts-expect-error – mocked store
    middleware({ getState })(next)(action);

    expect(next).toBeCalledWith({
      ...action,
      payload: {
        ...action.payload,
        options: { pluginOptions: { pluginTest: { ok: true }, i18n: { localized: true } } },
      },
    });
  });
});
