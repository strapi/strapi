import middleware from '../extendCTBInitialDataMiddleware';

describe('i18n | middlewares | extendCTBInitialDataMiddleware', () => {
  describe('the action type matches "ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT"', () => {
    it('forwards the action when the action type does not match', () => {
      const extendCTBInitialDataMiddleware = middleware();
      const next = jest.fn();
      const action = {};

      extendCTBInitialDataMiddleware()(next)(action);

      expect(next).toBeCalledWith(action);
    });

    it('forwards the action when the modalType and actionType are undefined', () => {
      const extendCTBInitialDataMiddleware = middleware();
      const next = jest.fn();
      const action = {
        type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
        modalType: undefined,
        actionType: undefined,
      };

      extendCTBInitialDataMiddleware()(next)(action);

      expect(next).toBeCalledWith(action);
    });

    it('forwards the action when the action.data.pluginOptions.i18n.localized path exists', () => {
      const extendCTBInitialDataMiddleware = middleware();
      const next = jest.fn();
      const action = {
        type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
        modalType: undefined,
        actionType: undefined,
        data: { pluginOptions: { i18n: { localized: false } } },
      };

      extendCTBInitialDataMiddleware()(next)(action);

      expect(next).toBeCalledWith(action);
    });

    it('adds a pluginOptions to the action when data is defined and the action', () => {
      const extendCTBInitialDataMiddleware = middleware();
      const next = jest.fn();
      const action = {
        type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
        modalType: 'contentType',
        actionType: 'edit',
        data: {},
      };

      extendCTBInitialDataMiddleware()(next)(action);

      expect(next).toBeCalledWith({
        type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
        modalType: 'contentType',
        actionType: 'edit',
        data: {
          pluginOptions: { i18n: { localized: false } },
        },
      });
    });

    it('modifies the data.pluginOptions in the action when it already exists', () => {
      const extendCTBInitialDataMiddleware = middleware();
      const next = jest.fn();
      const action = {
        type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
        modalType: 'contentType',
        actionType: 'edit',
        data: {
          pluginOptions: {
            somePluginThings: true,
          },
        },
      };

      extendCTBInitialDataMiddleware()(next)(action);

      expect(next).toBeCalledWith({
        type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
        modalType: 'contentType',
        actionType: 'edit',
        data: {
          pluginOptions: { i18n: { localized: false }, somePluginThings: true },
        },
      });
    });
  });
});
