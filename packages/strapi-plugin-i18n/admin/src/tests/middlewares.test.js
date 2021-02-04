import middlewares from '../middlewares';

describe('extendCTBInitialDataMiddleware', () => {
  it('forwards the action when the action, type does not match', () => {
    const extendCTBInitialDataMiddleware = middlewares[0]();
    const next = jest.fn();
    const action = {};

    extendCTBInitialDataMiddleware()(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('forwards the action when the action type is "ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT" but modalType and actionType are undefined', () => {
    const extendCTBInitialDataMiddleware = middlewares[0]();
    const next = jest.fn();
    const action = {
      type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
      modalType: undefined,
      actionType: undefined,
    };

    extendCTBInitialDataMiddleware()(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('forwards the action when the action type is "ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT" and modalType is "contentType" but actionType are undefined', () => {
    const extendCTBInitialDataMiddleware = middlewares[0]();
    const next = jest.fn();
    const action = {
      type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
      modalType: 'contentType',
      actionType: undefined,
    };

    extendCTBInitialDataMiddleware()(next)(action);

    expect(next).toBeCalledWith(action);
  });

  it('adds a pluginOptions to the action when action.data is undefined', () => {
    const extendCTBInitialDataMiddleware = middlewares[0]();
    const next = jest.fn();
    const action = {
      type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
      modalType: 'contentType',
      actionType: 'create',
      data: undefined,
    };

    extendCTBInitialDataMiddleware()(next)(action);

    expect(next).toBeCalledWith({
      type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
      modalType: 'contentType',
      actionType: 'create',
      data: {
        pluginOptions: { i18n: { localized: true } },
      },
    });
  });

  it('adds a pluginOptions to the action when data is defined', () => {
    const extendCTBInitialDataMiddleware = middlewares[0]();
    const next = jest.fn();
    const action = {
      type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
      modalType: 'contentType',
      actionType: 'create',
      data: {},
    };

    extendCTBInitialDataMiddleware()(next)(action);

    expect(next).toBeCalledWith({
      type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
      modalType: 'contentType',
      actionType: 'create',
      data: {
        pluginOptions: { i18n: { localized: true } },
      },
    });
  });

  it('modifies the data.pluginOptions in the action when it already exists', () => {
    const extendCTBInitialDataMiddleware = middlewares[0]();
    const next = jest.fn();
    const action = {
      type: 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT',
      modalType: 'contentType',
      actionType: 'create',
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
      actionType: 'create',
      data: {
        pluginOptions: { i18n: { localized: true }, somePluginThings: true },
      },
    });
  });
});
