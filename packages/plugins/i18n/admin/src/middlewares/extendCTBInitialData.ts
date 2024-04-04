import type { Middleware } from '@reduxjs/toolkit';
import type { Store } from '@strapi/admin/strapi-admin';

const extendCTBInitialDataMiddleware: () => Middleware<
  object,
  ReturnType<Store['getState']>
> = () => {
  return () => (next) => (action) => {
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
      if (!action.data.pluginOptions?.i18n?.localized) {
        return next({ ...action, data });
      }
    }

    // action is not the one we want to override
    return next(action);
  };
};

export { extendCTBInitialDataMiddleware };
