import get from 'lodash/get';
import merge from 'lodash/merge';
import cloneDeep from 'lodash/cloneDeep';
import { parse } from 'qs';
import {
  getFetchClient,
  formatContentTypeData,
  contentManagementUtilRemoveFieldsFromData,
} from '@strapi/helper-plugin';
import pluginId from '../pluginId';

const addCommonFieldsToInitialDataMiddleware =
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
    const relatedEntityId = get(query, 'plugins.i18n.relatedEntityId', null);
    const locale = get(query, 'plugins.i18n.locale', null);
    const isSingleType = action.isSingleType;

    if (!relatedEntityId && !isSingleType) {
      return next(action);
    }

    const store = getState();
    const cmDataStore = store['content-manager_editViewCrudReducer'];
    const cmLayoutStore = store['content-manager_editViewLayoutManager'];
    const { contentTypeDataStructure } = cmDataStore;
    const { currentLayout } = cmLayoutStore;

    const getData = async () => {
      // Show a loader
      dispatch({ type: 'ContentManager/CrudReducer/GET_DATA' });
      const defaultDataStructure = cloneDeep(contentTypeDataStructure);

      try {
        const { data } = await getFetchClient().post(
          `/${pluginId}/content-manager/actions/get-non-localized-fields`,
          { model: currentLayout.contentType.uid, id: relatedEntityId, locale }
        );

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

export default addCommonFieldsToInitialDataMiddleware;
