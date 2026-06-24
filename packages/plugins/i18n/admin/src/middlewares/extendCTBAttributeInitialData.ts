// [lodash: get — partially kept, dynamic uid in array path prevents full removal]
// eslint-disable-next-line you-dont-need-lodash-underscore/get
import get from 'lodash/get';

import type { Middleware } from '@reduxjs/toolkit';
import type { Store } from '@strapi/admin/strapi-admin';

const extendCTBAttributeInitialDataMiddleware: () => Middleware<
  object,
  ReturnType<Store['getState']>
> = () => {
  return ({ getState }) =>
    (next) =>
    (action) => {
      const enhanceAction = ({ uid }: { uid: string }) => {
        // the block here is to catch the error when trying to access the state
        // of the ctb when the plugin is not mounted
        try {
          const store = getState();

          const type = get(store, [
            'content-type-builder_dataManagerProvider',
            'current',
            'contentTypes',
            uid,
          ]);

          if (!type || type.modelType !== 'contentType') {
            return next(action);
          }

          // [lodash: get (line 19) — skipped, dynamic uid in array path]
          const hasi18nEnabled = (type as any)?.pluginOptions?.i18n?.localized ?? false;

          if (hasi18nEnabled) {
            return next({
              ...action,
              payload: {
                ...action.payload,
                options: {
                  pluginOptions: {
                    ...(action?.payload?.options?.pluginOptions ?? {}),
                    i18n: {
                      localized: true,
                    },
                  },
                },
              },
            });
          }

          return next(action);
        } catch (err) {
          return next(action);
        }
      };

      const { payload = {}, type } = action ?? {};

      if (
        type === 'formModal/setAttributeDataSchema' &&
        !['relation', 'component'].includes(payload.attributeType) &&
        !payload.isEditing
      ) {
        return enhanceAction({
          uid: payload.uid,
        });
      }

      if (type === 'formModal/setCustomFieldDataSchema' && !payload.isEditing) {
        return enhanceAction({
          uid: payload.uid,
        });
      }

      if (
        type === 'formModal/resetPropsAndSetFormForAddingAnExistingCompo' ||
        type === 'formModal/resetPropsAndSaveCurrentData'
      ) {
        return enhanceAction({
          uid: payload.uid,
        });
      }

      return next(action);
    };
};

export { extendCTBAttributeInitialDataMiddleware };
