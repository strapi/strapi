const extendCTBInitialDataMiddleware = () => {
  return () => next => action => {
    if (
      action.type === 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT' &&
      action.modalType === 'contentType' &&
      action.actionType === 'create'
    ) {
      const i18n = { localized: true };

      const pluginOptions =
        action.data && action.data.pluginOptions
          ? { ...action.data.pluginOptions, i18n }
          : { i18n };

      const data = { ...action.data, pluginOptions };

      return next({ ...action, data });
    }

    // action is not the one we want to override
    return next(action);
  };
};

const middlewares = [extendCTBInitialDataMiddleware];

export default middlewares;
