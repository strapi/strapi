import { has } from 'lodash';

const extendCTBInitialDataMiddleware = () => {
  return () => next => action => {
    if (
      action.type === 'ContentTypeBuilder/FormModal/SET_DATA_TO_EDIT' &&
      action.modalType === 'contentType'
    ) {
      const i18n = { localized: false };

      const pluginOptions = action.data.pluginOptions
        ? { ...action.data.pluginOptions, i18n }
        : { i18n };

      const data = { ...action.data, pluginOptions };

      if (action.actionType === 'create') {
        return next({ ...action, data });
      }

      // Override the action if the pluginOption config does not contain i18n
      // In this case we need to set the proper initialData shape
      if (!has(action.data.pluginOptions, 'i18n.localized')) {
        return next({ ...action, data });
      }
    }

    // action is not the one we want to override
    return next(action);
  };
};

const extendCTBAttributeInitialDataMiddleware = () => {
  return ({ getState }) => next => action => {
    const enhanceAction = () => {
      try {
        const hasi18nEnabled = getState().getIn([
          'content-type-builder_dataManagerProvider',
          'modifiedData',
          'contentType',
          'schema',
          'pluginOptions',
          'i18n',
          'localized',
        ]);

        if (hasi18nEnabled) {
          const pluginOptions = action.options
            ? { ...action.options.pluginOptions, i18n: { localized: true } }
            : { i18n: { localized: true } };

          return next({
            ...action,
            options: {
              pluginOptions,
            },
          });
        }

        return next(action);
      } catch (err) {
        return next(action);
      }
    };

    if (
      action.type === 'ContentTypeBuilder/FormModal/SET_ATTRIBUTE_DATA_SCHEMA' &&
      action.forTarget === 'contentType' &&
      !['relation', 'media', 'component'].includes(action.attributeType) &&
      !action.isEditing
    ) {
      // We need to make sure the plugin is installed
      return enhanceAction();
    }

    if (
      (action.type ===
        'ContentTypeBuilder/FormModal/RESET_PROPS_AND_SET_FORM_FOR_ADDING_AN_EXISTING_COMPO' ||
        action.type === 'ContentTypeBuilder/FormModal/RESET_PROPS_AND_SAVE_CURRENT_DATA') &&
      action.forTarget === 'contentType'
    ) {
      return enhanceAction();
    }

    return next(action);
  };
};

const middlewares = [extendCTBInitialDataMiddleware, extendCTBAttributeInitialDataMiddleware];

export default middlewares;
