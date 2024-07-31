import { Middleware } from '@reduxjs/toolkit';
import {
  contentManagementUtilRemoveFieldsFromData,
  formatContentTypeData,
  getFetchClient,
} from '@strapi/helper-plugin';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import merge from 'lodash/merge';
import { ParsedQs, parse } from 'qs';

import { pluginId } from '../pluginId';
import { RootState } from '../store/reducers';

import type { GetNonLocalizedFields } from '../../../shared/contracts/content-manager';
import type { Schema } from '@strapi/types';
import type { AxiosResponse } from 'axios';

const addCommonFieldsToInitialDataMiddleware: () => Middleware<object, RootState> =
  () =>
  ({ getState, dispatch }) =>
  (next) =>
  (action) => {
    if (action.type !== 'ContentManager/CrudReducer/INIT_FORM') {
      return next(action);
    }

    if (!action.rawQuery) {
      return next(action);
    }

    const search = action.rawQuery.substring(1);
    const query = parse(search);
    const relatedEntityId = get(query, 'plugins.i18n.relatedEntityId', undefined);
    const locale = get(query, 'plugins.i18n.locale', undefined);
    const isSingleType = action.isSingleType;

    if (!relatedEntityId && !isSingleType) {
      return next(action);
    }

    const store = getState();
    const cmDataStore = store['content-manager_editViewCrudReducer'];
    const cmLayoutStore = store['content-manager_editViewLayoutManager'];
    const { contentTypeDataStructure } = cmDataStore;
    const { currentLayout } = cmLayoutStore as {
      currentLayout: {
        contentType: Schema.ContentType;
        components: Record<string, Schema.Component>;
      };
    };

    const getData = async () => {
      if (
        !isParsedParamUndefinedOrString(relatedEntityId) ||
        !isParsedParamUndefinedOrString(locale)
      ) {
        return;
      }

      // Show a loader
      dispatch({ type: 'ContentManager/CrudReducer/GET_DATA' });
      const defaultDataStructure = cloneDeep(contentTypeDataStructure);

      try {
        const { data } = await getFetchClient().post<
          GetNonLocalizedFields.Response,
          AxiosResponse<GetNonLocalizedFields.Response>,
          GetNonLocalizedFields.Request['body']
        >(`/${pluginId}/content-manager/actions/get-non-localized-fields`, {
          model: currentLayout.contentType.uid,
          id: relatedEntityId,
          locale,
        });

        const { nonLocalizedFields, localizations } = data;

        const merged = merge(defaultDataStructure, nonLocalizedFields);

        const fieldsToRemove = [
          'createdBy',
          'updatedBy',
          'publishedAt',
          'id',
          '_id',
          'updatedAt',
          'createdAt',
        ];
        const cleanedMerged = contentManagementUtilRemoveFieldsFromData(
          merged,
          currentLayout.contentType,
          currentLayout.components,
          fieldsToRemove
        );
        cleanedMerged.localizations = localizations;

        action.data = formatContentTypeData(
          cleanedMerged,
          currentLayout.contentType,
          currentLayout.components
        );
      } catch (err) {
        // Silent
      }

      return next(action);
    };

    return getData();
  };

const isParsedParamUndefinedOrString = (param: ParsedQs[string]): param is undefined | string =>
  typeof param === 'string' || param === undefined;

export { addCommonFieldsToInitialDataMiddleware };
