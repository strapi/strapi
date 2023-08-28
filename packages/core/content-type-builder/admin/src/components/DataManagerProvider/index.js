import * as React from 'react';

import {
  LoadingIndicatorPage,
  useAPIErrorHandler,
  useAppInfo,
  useAutoReloadOverlayBlocker,
  useFetchClient,
  useGuidedTour,
  useNotification,
  useRBACProvider,
  useStrapiApp,
  useTracking,
} from '@strapi/helper-plugin';
import groupBy from 'lodash/groupBy';
import set from 'lodash/set';
import size from 'lodash/size';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useQueries, useMutation } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect, useLocation, useRouteMatch } from 'react-router-dom';

import DataManagerContext from '../../contexts/DataManagerContext';
import useFormModalNavigation from '../../hooks/useFormModalNavigation';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import makeUnique from '../../utils/makeUnique';
import FormModal from '../FormModal';

import {
  ADD_ATTRIBUTE,
  ADD_CREATED_COMPONENT_TO_DYNAMIC_ZONE,
  ADD_CUSTOM_FIELD_ATTRIBUTE,
  CHANGE_DYNAMIC_ZONE_COMPONENTS,
  CREATE_COMPONENT_SCHEMA,
  CREATE_SCHEMA,
  DELETE_NOT_SAVED_TYPE,
  EDIT_ATTRIBUTE,
  EDIT_CUSTOM_FIELD_ATTRIBUTE,
  GET_DATA_SUCCEEDED,
  RELOAD_PLUGIN,
  REMOVE_COMPONENT_FROM_DYNAMIC_ZONE,
  REMOVE_FIELD,
  REMOVE_FIELD_FROM_DISPLAYED_COMPONENT,
  SET_MODIFIED_DATA,
  UPDATE_SCHEMA,
} from './constants';
import { selectDataManagerProvider } from './selectors';
import { formatMainDataType, getComponentsToPost, sortContentType } from './utils/cleanData';
import createDataObject from './utils/createDataObject';
import createModifiedDataSchema from './utils/createModifiedDataSchema';
import formatSchemas from './utils/formatSchemas';
import retrieveComponentsFromSchema from './utils/retrieveComponentsFromSchema';
import { retrieveComponentsThatHaveComponents } from './utils/retrieveComponentsThatHaveComponents';
import retrieveNestedComponents from './utils/retrieveNestedComponents';
import retrieveSpecificInfoFromComponents from './utils/retrieveSpecificInfoFromComponents';
import serverRestartWatcher from './utils/serverRestartWatcher';
import validateSchema from './utils/validateSchema';

const DataManagerProvider = ({ children }) => {
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();
  const { setCurrentStep } = useGuidedTour();
  const { formatAPIError } = useAPIErrorHandler();
  const { getPlugin } = useStrapiApp();
  const { autoReload } = useAppInfo();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { refetchPermissions } = useRBACProvider();
  const { pathname } = useLocation();
  const { onCloseModal } = useFormModalNavigation();
  const contentTypeMatch = useRouteMatch(`/plugins/${pluginId}/content-types/:uid`);
  const componentMatch = useRouteMatch(
    `/plugins/${pluginId}/component-categories/:categoryUid/:componentUid`
  );
  const { get, put, post, del } = useFetchClient();
  const {
    components,
    contentTypes,
    isLoading,
    initialData,
    modifiedData,
    reservedNames: reservedNamesDefault,
  } = useSelector(selectDataManagerProvider);

  const { apis } = getPlugin(pluginId);

  const isInDevelopmentMode = autoReload;
  const isInContentTypeView = contentTypeMatch !== null;
  const firstKeyToMainSchema = isInContentTypeView ? 'contentType' : 'component';
  const currentUid = isInContentTypeView
    ? contentTypeMatch?.params?.uid ?? null
    : componentMatch?.params?.componentUid ?? null;

  const endPoint = isInContentTypeView ? 'content-types' : 'components';

  const setModifiedData = React.useCallback(() => {
    const currentSchemas = isInContentTypeView ? contentTypes : components;
    const schemaToSet = currentSchemas?.[currentUid] ?? {
      schema: { attributes: [] },
    };

    const retrievedComponents = retrieveComponentsFromSchema(
      schemaToSet.schema.attributes,
      components
    );

    const newSchemaToSet = createModifiedDataSchema(
      schemaToSet,
      retrievedComponents,
      components,
      isInContentTypeView
    );

    const hasJustCreatedSchema =
      (schemaToSet?.isTemporary ?? false) && size(schemaToSet?.schema?.attributes ?? []) === 0;

    dispatch({
      type: SET_MODIFIED_DATA,
      schemaToSet: newSchemaToSet,
      hasJustCreatedSchema,
    });
  }, [components, contentTypes, currentUid, dispatch, isInContentTypeView]);

  const [
    {
      data: componentsArray,
      error: errorComponents,
      isLoading: isLoadingComponents,
      refetch: refetchComponents,
    },
    {
      data: contentTypesArray,
      error: errorContentTypes,
      isLoading: isLoadingContentTypes,
      refetch: refetchContentTypes,
    },
    { data: reservedNames, error: errorReserverdNames, isLoading: isLoadingReservedNames },
  ] = useQueries([
    {
      queryKey: [pluginId, 'components'],
      async queryFn() {
        const {
          data: { data },
        } = await get(`/content-type-builder/components`);

        return data;
      },
      cacheTime: 0,
    },

    {
      queryKey: [pluginId, 'content-types'],
      async queryFn() {
        const {
          data: { data },
        } = await get(`/content-type-builder/content-types`);

        return data;
      },
      cacheTime: 0,
    },

    {
      queryKey: [pluginId, 'reserved-names'],
      async queryFn() {
        // TODO: this endpoint is not following the structure of the others
        const { data } = await get(`/content-type-builder/reserved-names`);

        return data;
      },
      cacheTime: 0,
    },
  ]);

  const refetch = async () => {
    await Promise.all([refetchComponents(), refetchContentTypes()]);
  };

  const deleteCategoryMutation = useMutation(
    (categoryUid) => del(`/content-type-builder/component-categories/${categoryUid}`),
    {
      async onSuccess() {
        await refetch();
        unlockAppWithAutoreload();
      },

      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  const deleteDataMutation = useMutation(
    (currentUid) => del(`/content-type-builder/${endPoint}/${currentUid}`),
    {
      async onSuccess() {
        await refetch();
        unlockAppWithAutoreload();
      },

      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  const submitDataMutation = useMutation(
    ({ isCreating, body }) => {
      if (!isCreating) {
        return put(`/content-type-builder/${endPoint}/${currentUid}`, body);
      }

      return post(`/content-type-builder/${endPoint}`, body);
    },
    {
      onError(error) {
        if (!isInContentTypeView) {
          trackUsage('didNotSaveComponent');
        }

        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },

      async onSuccess(data, variables) {
        await refetch();

        if (
          variables.isCreating &&
          (initialData.contentType?.schema.kind === 'collectionType' ||
            initialData.contentType?.schema.kind === 'singleType')
        ) {
          setCurrentStep('contentTypeBuilder.success');
        }

        // Submit ct tracking success
        if (isInContentTypeView) {
          trackUsage('didSaveContentType');

          const oldName = variables.body?.contentType?.schema?.name ?? '';
          const newName = initialData?.contentType?.schema?.name ?? '';

          if (!variables.isCreating && oldName !== newName) {
            trackUsage('didEditNameOfContentType');
          }
        } else {
          trackUsage('didSaveComponent');
        }

        // Update the app's permissions
        await updatePermissions();

        unlockAppWithAutoreload();
      },
    }
  );

  const editCategoryMutation = useMutation(
    ({ categoryUid, body }) =>
      put(`/content-type-builder/component-categories/${categoryUid}`, body),
    {
      async onSuccess() {
        await refetch();
        unlockAppWithAutoreload();
      },

      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  React.useEffect(() => {
    const isLoading = isLoadingComponents || isLoadingContentTypes || isLoadingReservedNames;

    const hasError = !!(errorComponents || errorContentTypes || errorReserverdNames);

    if (!isLoading && !hasError) {
      dispatch({
        type: GET_DATA_SUCCEEDED,
        components: formatSchemas(createDataObject(componentsArray)),
        contentTypes: formatSchemas(createDataObject(contentTypesArray)),
        reservedNames,
      });
    } else if (!isLoading && hasError) {
      [errorComponents, errorContentTypes, errorReserverdNames].filter(Boolean).forEach((error) => {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      });
    }
  }, [
    componentsArray,
    contentTypesArray,
    dispatch,
    errorComponents,
    errorContentTypes,
    errorReserverdNames,
    formatAPIError,
    isLoadingComponents,
    isLoadingContentTypes,
    isLoadingReservedNames,
    reservedNames,
    toggleNotification,
  ]);

  React.useEffect(() => {
    if (!isLoading && currentUid) {
      setModifiedData();
    }
    // Set modified data also on path changes
  }, [currentUid, isLoading, setModifiedData, pathname]);

  React.useEffect(() => {
    return () => {
      // Reload the plugin so the cycle is new again
      dispatch({ type: RELOAD_PLUGIN });
    };
  }, [dispatch]);

  React.useEffect(() => {
    if (!autoReload) {
      toggleNotification({
        type: 'info',
        message: { id: getTrad('notification.info.autoreaload-disable') },
      });
    }
  }, [autoReload, toggleNotification]);

  const addAttribute = (
    attributeToSet,
    forTarget,
    targetUid,
    isEditing = false,
    initialAttribute,
    shouldAddComponentToData = false
  ) => {
    const actionType = isEditing ? EDIT_ATTRIBUTE : ADD_ATTRIBUTE;

    dispatch({
      type: actionType,
      attributeToSet,
      forTarget,
      targetUid,
      initialAttribute,
      shouldAddComponentToData,
    });
  };

  const addCustomFieldAttribute = ({ attributeToSet, forTarget, targetUid, initialAttribute }) => {
    dispatch({
      type: ADD_CUSTOM_FIELD_ATTRIBUTE,
      attributeToSet,
      forTarget,
      targetUid,
      initialAttribute,
    });
  };

  const editCustomFieldAttribute = ({ attributeToSet, forTarget, targetUid, initialAttribute }) => {
    dispatch({
      type: EDIT_CUSTOM_FIELD_ATTRIBUTE,
      attributeToSet,
      forTarget,
      targetUid,
      initialAttribute,
    });
  };

  const addCreatedComponentToDynamicZone = (dynamicZoneTarget, componentsToAdd) => {
    dispatch({
      type: ADD_CREATED_COMPONENT_TO_DYNAMIC_ZONE,
      dynamicZoneTarget,
      componentsToAdd,
    });
  };

  const createSchema = (
    data,
    schemaType,
    uid,
    componentCategory,
    shouldAddComponentToData = false
  ) => {
    const type = schemaType === 'contentType' ? CREATE_SCHEMA : CREATE_COMPONENT_SCHEMA;

    dispatch({
      type,
      data,
      componentCategory,
      schemaType,
      uid,
      shouldAddComponentToData,
    });
  };

  const changeDynamicZoneComponents = (dynamicZoneTarget, newComponents) => {
    dispatch({
      type: CHANGE_DYNAMIC_ZONE_COMPONENTS,
      dynamicZoneTarget,
      newComponents,
    });
  };

  const removeAttribute = (mainDataKey, attributeToRemoveName, componentUid = '') => {
    const type =
      mainDataKey === 'components' ? REMOVE_FIELD_FROM_DISPLAYED_COMPONENT : REMOVE_FIELD;

    if (mainDataKey === 'contentType') {
      trackUsage('willDeleteFieldOfContentType');
    }

    dispatch({
      type,
      mainDataKey,
      attributeToRemoveName,
      componentUid,
    });
  };

  const deleteCategory = async (categoryUid) => {
    const userConfirm = window.confirm(
      formatMessage({
        id: getTrad('popUpWarning.bodyMessage.category.delete'),
      })
    );

    onCloseModal();

    if (userConfirm) {
      // Lock the app
      lockAppWithAutoreload();

      deleteCategoryMutation.mutate(categoryUid);

      // Make sure to wait for the server to restart
      await serverRestartWatcher(true);
    }
  };

  const deleteData = async () => {
    const isTemporary = modifiedData?.[firstKeyToMainSchema]?.isTemporary ?? false;

    const userConfirm = window.confirm(
      formatMessage({
        id: getTrad(
          `popUpWarning.bodyMessage.${isInContentTypeView ? 'contentType' : 'component'}.delete`
        ),
      })
    );

    // Close the modal
    onCloseModal();

    if (userConfirm) {
      if (isTemporary) {
        // Delete the not saved type
        // Here we just need to reset the components to the initial ones and also the content types
        // Doing so will trigging a url change since the type doesn't exist in either the contentTypes or the components
        // so the modified and the initial data will also be reset in the useEffect...
        dispatch({ type: DELETE_NOT_SAVED_TYPE });
      } else {
        // Lock the app
        lockAppWithAutoreload();

        deleteDataMutation.mutate(currentUid);

        // Make sure to wait for the server to restart
        await serverRestartWatcher(true);
      }
    }
  };

  const editCategory = async (categoryUid, body) => {
    // Close the modal
    onCloseModal();

    // Lock the app
    lockAppWithAutoreload();

    editCategoryMutation.mutate({
      categoryUid,
      body,
    });

    // Make sure to wait for the server to restart
    await serverRestartWatcher(true);
  };

  const getAllComponentsThatHaveAComponentInTheirAttributes = () => {
    // We need to create an object with all the non modified compos
    // plus the ones that are created on the fly
    const allCompos = Object.assign({}, components, modifiedData.components);

    // Since we apply the modification of a specific component only in the modified data
    // we need to update all compos with the modifications
    if (!isInContentTypeView) {
      const currentEditedCompo = modifiedData?.component ?? {};

      set(allCompos, currentEditedCompo?.uid ?? '', currentEditedCompo);
    }

    const composWithCompos = retrieveComponentsThatHaveComponents(allCompos);

    return makeUnique(composWithCompos);
  };

  const getAllNestedComponents = () => {
    const appNestedCompo = retrieveNestedComponents(components);
    const editingDataNestedCompos = retrieveNestedComponents(modifiedData.components || {});

    return makeUnique([...editingDataNestedCompos, ...appNestedCompo]);
  };

  const removeComponentFromDynamicZone = (dzName, componentToRemoveIndex) => {
    dispatch({
      type: REMOVE_COMPONENT_FROM_DYNAMIC_ZONE,
      dzName,
      componentToRemoveIndex,
    });
  };

  const shouldRedirect = React.useMemo(() => {
    const dataSet = isInContentTypeView ? contentTypes : components;

    if (currentUid === 'create-content-type') {
      return false;
    }

    return !Object.keys(dataSet).includes(currentUid) && !isLoading;
  }, [components, contentTypes, currentUid, isInContentTypeView, isLoading]);

  const redirectEndpoint = React.useMemo(() => {
    const allowedEndpoints = Object.keys(contentTypes)
      .filter((uid) => contentTypes?.[uid]?.schema?.visible ?? true)
      .sort();

    return allowedEndpoints?.[0] ?? 'create-content-type';
  }, [contentTypes]);

  if (shouldRedirect) {
    return <Redirect to={`/plugins/${pluginId}/content-types/${redirectEndpoint}`} />;
  }

  const submitData = async (additionalContentTypeData) => {
    const isCreating = modifiedData?.[firstKeyToMainSchema]?.isTemporary ?? false;
    const body = {
      components: getComponentsToPost(modifiedData.components, components, currentUid, isCreating),
    };

    if (isInContentTypeView) {
      const contentType = apis.forms.mutateContentTypeSchema(
        {
          ...formatMainDataType(modifiedData.contentType),
          ...additionalContentTypeData,
        },
        initialData.contentType
      );

      const isValidSchema = validateSchema(contentType);

      if (!isValidSchema) {
        toggleNotification({
          type: 'warning',
          message: {
            id: getTrad('notification.error.dynamiczone-min.validation'),
            defaultMessage:
              'At least one component is required in a dynamic zone to be able to save a content type',
          },
        });

        return;
      }

      body.contentType = contentType;

      trackUsage('willSaveContentType');
    } else {
      body.component = formatMainDataType(modifiedData.component, true);

      trackUsage('willSaveComponent');
    }

    // Lock the app
    lockAppWithAutoreload();

    submitDataMutation.mutate({
      isCreating,
      body,
    });

    // Make sure to wait for the server to restart
    await serverRestartWatcher(true);
  };

  const updatePermissions = async () => {
    await refetchPermissions();
  };

  const updateSchema = (data, schemaType, componentUID) => {
    dispatch({
      type: UPDATE_SCHEMA,
      data,
      schemaType,
      uid: componentUID,
    });
  };

  return (
    <DataManagerContext.Provider
      value={{
        addAttribute,
        addCustomFieldAttribute,
        addCreatedComponentToDynamicZone,
        allComponentsCategories: retrieveSpecificInfoFromComponents(components, ['category']),
        changeDynamicZoneComponents,
        components,
        componentsGroupedByCategory: groupBy(components, 'category'),
        componentsThatHaveOtherComponentInTheirAttributes:
          getAllComponentsThatHaveAComponentInTheirAttributes(),
        contentTypes,
        createSchema,
        deleteCategory,
        deleteData,
        editCategory,
        editCustomFieldAttribute,
        isInDevelopmentMode,
        initialData,
        isInContentTypeView,
        modifiedData,
        nestedComponents: getAllNestedComponents(),
        removeAttribute,
        removeComponentFromDynamicZone,
        reservedNames: reservedNamesDefault,
        setModifiedData,
        sortedContentTypesList: sortContentType(contentTypes),
        submitData,
        updateSchema,
      }}
    >
      {isLoading ? (
        <LoadingIndicatorPage />
      ) : (
        <>
          {children}
          {isInDevelopmentMode && <FormModal />}
        </>
      )}
    </DataManagerContext.Provider>
  );
};

DataManagerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DataManagerProvider;
