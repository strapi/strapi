const extendCTBInitialDataMiddleware = () => {
  return () => next => action => {
    if (
      action.type === 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT' &&
      action.modalType === 'contentType' &&
      action.actionType === 'create'
    ) {
      // TODO
      const data = { ...action.data, 'i18n-enabled': false, locales: [] };

      return next({ ...action, data });
    }

    // action is not the one we want to override
    return next(action);
  };
};

const middlewares = [extendCTBInitialDataMiddleware];

export default middlewares;
