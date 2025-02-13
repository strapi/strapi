import { memo, useEffect, useMemo, useRef, ReactNode } from 'react';

import {
  useGuidedTour,
  useTracking,
  useStrapiApp,
  useNotification,
  useAppInfo,
  useFetchClient,
  useAuth,
} from '@strapi/admin/strapi-admin';
import get from 'lodash/get';
import groupBy from 'lodash/groupBy';
import set from 'lodash/set';
import size from 'lodash/size';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useLocation, useMatch } from 'react-router-dom';

import { DataManagerContext } from '../../contexts/DataManagerContext';
import { useFormModalNavigation } from '../../hooks/useFormModalNavigation';
import { pluginId } from '../../pluginId';
import { getTrad } from '../../utils/getTrad';
import { useAutoReloadOverlayBlocker } from '../AutoReloadOverlayBlocker';
import { FormModal } from '../FormModal/FormModal';

import { actions } from './reducer';
import { makeSelectDataManagerProvider } from './selectors';
import { formatMainDataType, getComponentsToPost, sortContentType } from './utils/cleanData';
import { createDataObject } from './utils/createDataObject';
import { createModifiedDataSchema } from './utils/createModifiedDataSchema';
import { formatSchemas } from './utils/formatSchemas';
import { retrieveComponentsFromSchema } from './utils/retrieveComponentsFromSchema';
import { retrieveComponentsThatHaveComponents } from './utils/retrieveComponentsThatHaveComponents';
import { retrieveNestedComponents } from './utils/retrieveNestedComponents';
import { retrieveSpecificInfoFromComponents } from './utils/retrieveSpecificInfoFromComponents';
import { serverRestartWatcher } from './utils/serverRestartWatcher';
import { validateSchema } from './utils/validateSchema';

import type { ContentType, SchemaType, Components } from '../../types';
import type { Internal } from '@strapi/types';

interface DataManagerProviderProps {
  children: ReactNode;
}

interface CustomFieldAttributeParams {
  attributeToSet: Record<string, any>;
  forTarget: SchemaType;
  targetUid: Internal.UID.Schema;
  initialAttribute: Record<string, any>;
}

const DataManagerProvider = ({ children }: DataManagerProviderProps) => {
  const dispatch = useDispatch();
  // refactor
  const { components, contentTypes, isLoading, initialData, modifiedData, reservedNames } =
    useSelector(makeSelectDataManagerProvider());
  const { toggleNotification } = useNotification();
  const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();
  const { setCurrentStep, setStepState } = useGuidedTour('DataManagerProvider', (state) => state);

  const getPlugin = useStrapiApp('DataManagerProvider', (state) => state.getPlugin);

  const plugin = getPlugin(pluginId);
  const autoReload = useAppInfo('DataManagerProvider', (state) => state.autoReload);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const refetchPermissions = useAuth('DataManagerProvider', (state) => state.refetchPermissions);
  const { pathname } = useLocation();
  const { onCloseModal } = useFormModalNavigation();
  const contentTypeMatch = useMatch(`/plugins/${pluginId}/content-types/:uid`);
  const componentMatch = useMatch(
    `/plugins/${pluginId}/component-categories/:categoryUid/:componentUid`
  );

  const fetchClient = useFetchClient();
  const { put, post, del } = fetchClient;

  const isInDevelopmentMode = autoReload;

  const isInContentTypeView = contentTypeMatch !== null;
  const firstKeyToMainSchema = isInContentTypeView ? 'contentType' : 'component';
  const currentUid = isInContentTypeView
    ? get(contentTypeMatch, 'params.uid', null)
    : get(componentMatch, 'params.componentUid', null);

  const getDataRef = useRef<any>();
  const endPoint = isInContentTypeView ? 'content-types' : 'components';

  getDataRef.current = async () => {
    try {
      const [componentsResponse, contentTypesResponse, reservedNamesResponse] = await Promise.all([
        fetchClient.get(`/content-type-builder/components`),
        fetchClient.get(`/content-type-builder/content-types`),
        fetchClient.get(`/content-type-builder/reserved-names`),
      ]);

      const components = createDataObject(componentsResponse.data.data);
      const formattedComponents = formatSchemas(components);
      const contentTypes = createDataObject(contentTypesResponse.data.data);
      const formattedContentTypes = formatSchemas(contentTypes);

      dispatch(
        actions.init({
          components: formattedComponents,
          contentTypes: formattedContentTypes,
          reservedNames: reservedNamesResponse.data,
        })
      );
    } catch (err) {
      console.error({ err });
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  useEffect(() => {
    getDataRef.current();

    return () => {
      // Reload the plugin so the cycle is new again
      dispatch(actions.reloadPlugin());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // We need to set the modifiedData after the data has been retrieved
    // and also on pathname change
    if (!isLoading && currentUid) {
      setModifiedData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, pathname, currentUid]);

  useEffect(() => {
    if (!autoReload) {
      toggleNotification({
        type: 'info',
        message: formatMessage({ id: getTrad('notification.info.autoreaload-disable') }),
      });
    }
  }, [autoReload, toggleNotification, formatMessage]);

  const addAttribute = (
    attributeToSet: Record<string, any>,
    forTarget: SchemaType,
    targetUid: Internal.UID.Schema,
    isEditing = false,
    initialAttribute?: Record<string, any>,
    shouldAddComponentToData = false
  ) => {
    if (isEditing) {
      const payload = {
        attributeToSet,
        forTarget,
        targetUid,
        // NOTE: using ! here to avoid changing the code logic before bigger refactorings
        initialAttribute: initialAttribute!,
        shouldAddComponentToData,
      };

      dispatch(actions.editAttribute(payload));
    } else {
      const payload = {
        attributeToSet,
        forTarget,
        targetUid,
        shouldAddComponentToData,
      };

      dispatch(actions.addAttribute(payload));
    }
  };

  const addCustomFieldAttribute = ({
    attributeToSet,
    forTarget,
    targetUid,
  }: CustomFieldAttributeParams) => {
    dispatch(actions.addCustomFieldAttribute({ attributeToSet, forTarget, targetUid }));
  };

  const editCustomFieldAttribute = ({
    attributeToSet,
    forTarget,
    targetUid,
    initialAttribute,
  }: CustomFieldAttributeParams) => {
    dispatch(
      actions.editCustomFieldAttribute({
        attributeToSet,
        forTarget,
        targetUid,
        initialAttribute,
      })
    );
  };

  const addCreatedComponentToDynamicZone = (
    dynamicZoneTarget: string,
    componentsToAdd: Internal.UID.Component[]
  ) => {
    dispatch(actions.addCreatedComponentToDynamicZone({ dynamicZoneTarget, componentsToAdd }));
  };

  const createSchema = (
    data: Record<string, any>,
    schemaType: SchemaType,
    uid: Internal.UID.Schema,
    componentCategory?: string,
    shouldAddComponentToData = false
  ) => {
    if (schemaType === 'contentType') {
      const payload = {
        data,
        uid,
      };

      dispatch(actions.createSchema(payload));
    } else {
      const payload = {
        data,
        uid,
        componentCategory: componentCategory!,
        shouldAddComponentToData,
      };

      dispatch(actions.createComponentSchema(payload));
    }
  };

  const changeDynamicZoneComponents = (
    dynamicZoneTarget: string,
    newComponents: Internal.UID.Component[]
  ) => {
    dispatch(actions.changeDynamicZoneComponents({ dynamicZoneTarget, newComponents }));
  };

  const removeAttribute = (
    mainDataKey: 'components' | 'contentType' | 'component' | 'contentTypes',
    attributeToRemoveName: string,
    componentUid = ''
  ) => {
    if (mainDataKey === 'components') {
      dispatch(
        actions.removeFieldFromDisplayedComponent({
          attributeToRemoveName,
          componentUid,
        })
      );
    } else {
      if (mainDataKey === 'contentType') {
        trackUsage('willDeleteFieldOfContentType');
      }

      dispatch(
        actions.removeField({
          mainDataKey,
          attributeToRemoveName,
        })
      );
    }
  };

  const deleteCategory = async (categoryUid: string) => {
    try {
      const requestURL = `/${pluginId}/component-categories/${categoryUid}`;
      // eslint-disable-next-line no-alert
      const userConfirm = window.confirm(
        formatMessage({
          id: getTrad('popUpWarning.bodyMessage.category.delete'),
        })
      );
      // Close the modal
      onCloseModal();

      if (userConfirm) {
        lockAppWithAutoreload?.();

        await del(requestURL);

        // Make sure the server has restarted
        await serverRestartWatcher(true);

        // Unlock the app
        unlockAppWithAutoreload?.();

        await updatePermissions();
      }
    } catch (err) {
      console.error({ err });
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    } finally {
      unlockAppWithAutoreload?.();
    }
  };

  const deleteData = async () => {
    try {
      const requestURL = `/${pluginId}/${endPoint}/${currentUid}`;
      const isTemporary = get(modifiedData, [firstKeyToMainSchema, 'isTemporary'], false);

      // eslint-disable-next-line no-alert
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
          dispatch(actions.deleteNotSavedType());

          return;
        }

        lockAppWithAutoreload?.();

        await del(requestURL);

        // Make sure the server has restarted
        await serverRestartWatcher(true);

        // Unlock the app
        await unlockAppWithAutoreload?.();

        await getDataRef.current();
        // Refetch the permissions
        await updatePermissions();
      }
    } catch (err) {
      console.error({ err });
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    } finally {
      unlockAppWithAutoreload?.();
    }
  };

  const editCategory = async (categoryUid: string, body: any) => {
    try {
      const requestURL = `/${pluginId}/component-categories/${categoryUid}`;

      // Close the modal
      onCloseModal();

      // Lock the app
      lockAppWithAutoreload?.();

      // Update the category
      await put(requestURL, body);

      // Make sure the server has restarted
      await serverRestartWatcher(true);

      // Unlock the app
      await unlockAppWithAutoreload?.();

      await updatePermissions();
    } catch (err) {
      console.error({ err });
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    } finally {
      unlockAppWithAutoreload?.();
    }
  };

  const getAllComponentsThatHaveAComponentInTheirAttributes = () => {
    // We need to create an object with all the non modified compos
    // plus the ones that are created on the fly
    const allCompos = Object.assign({}, components, modifiedData.components);

    // Since we apply the modification of a specific component only in the modified data
    // we need to update all compos with the modifications
    if (!isInContentTypeView) {
      const currentEditedCompo = get(modifiedData, 'component', {});

      set(allCompos, get(currentEditedCompo, ['uid'], ''), currentEditedCompo);
    }

    const composWithCompos = retrieveComponentsThatHaveComponents(allCompos);

    return composWithCompos;
  };

  const getAllNestedComponents = () => {
    const appNestedCompo = retrieveNestedComponents(components);

    return appNestedCompo;
  };

  const removeComponentFromDynamicZone = (dzName: string, componentToRemoveIndex: number) => {
    dispatch(
      actions.removeComponentFromDynamicZone({
        dzName,
        componentToRemoveIndex,
      })
    );
  };

  const setModifiedData = () => {
    const currentSchemas = isInContentTypeView ? contentTypes : components;
    const schemaToSet = get(currentSchemas, currentUid ?? '', {
      schema: { attributes: [] },
    });

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
      get(schemaToSet, 'isTemporary', false) &&
      size(get(schemaToSet, 'schema.attributes', [])) === 0;

    dispatch(
      actions.setModifiedData({
        schemaToSet: newSchemaToSet,
        hasJustCreatedSchema,
      })
    );
  };

  const shouldRedirect = useMemo(() => {
    const dataSet = isInContentTypeView ? contentTypes : components;
    if (currentUid === 'create-content-type') {
      return false;
    }

    return !Object.keys(dataSet).includes(currentUid || '') && !isLoading;
  }, [components, contentTypes, currentUid, isInContentTypeView, isLoading]);

  const redirectEndpoint = useMemo(() => {
    const allowedEndpoints = Object.keys(contentTypes)
      .filter((uid) => get(contentTypes, [uid, 'schema', 'visible'], true))
      .sort();

    return get(allowedEndpoints, '0', 'create-content-type');
  }, [contentTypes]);

  if (shouldRedirect) {
    return <Navigate to={`/plugins/${pluginId}/content-types/${redirectEndpoint}`} />;
  }

  const submitData = async (additionalContentTypeData?: Record<string, any>) => {
    try {
      const isCreating = get(modifiedData, [firstKeyToMainSchema, 'isTemporary'], false);

      const body: {
        components: any[];
        contentType?: Record<string, any>;
        component?: any;
      } = {
        components: getComponentsToPost(
          modifiedData.components as Components,
          components as Components,
          currentUid as Internal.UID.Schema
        ),
      };

      if (isInContentTypeView) {
        const PluginForms = plugin?.apis?.forms as any;
        const contentType = PluginForms.mutateContentTypeSchema(
          {
            ...formatMainDataType(modifiedData.contentType),
            ...additionalContentTypeData,
          },
          initialData.contentType
        ) as ContentType;

        const isValidSchema = validateSchema(contentType);

        if (!isValidSchema) {
          toggleNotification({
            type: 'danger',
            message: formatMessage({
              id: getTrad('notification.error.dynamiczone-min.validation'),
              defaultMessage:
                'At least one component is required in a dynamic zone to be able to save a content type',
            }),
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
      lockAppWithAutoreload?.();

      const baseURL = `/${pluginId}/${endPoint}`;
      const requestURL = isCreating ? baseURL : `${baseURL}/${currentUid}`;

      if (isCreating) {
        await post(requestURL, body);
      } else {
        await put(requestURL, body);
      }

      if (
        isCreating &&
        (initialData.contentType?.schema.kind === 'collectionType' ||
          initialData.contentType?.schema.kind === 'singleType')
      ) {
        setStepState('contentTypeBuilder.success', true);
        trackUsage('didCreateGuidedTourCollectionType');
        setCurrentStep(null);
      }

      // Submit ct tracking success
      if (isInContentTypeView) {
        trackUsage('didSaveContentType');

        const oldName = get(body, ['contentType', 'schema', 'name'], '');
        const newName = get(initialData, ['contentType', 'schema', 'name'], '');

        if (!isCreating && oldName !== newName) {
          trackUsage('didEditNameOfContentType');
        }
      } else {
        trackUsage('didSaveComponent');
      }

      // Make sure the server has restarted
      await serverRestartWatcher(true);

      // Unlock the app
      unlockAppWithAutoreload?.();

      // refetch and update initial state after the data has been saved
      await getDataRef.current();

      // Update the app's permissions
      await updatePermissions();
    } catch (err: any) {
      if (!isInContentTypeView) {
        trackUsage('didNotSaveComponent');
      }

      console.error({ err: err.response });
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    } finally {
      unlockAppWithAutoreload?.();
    }
  };

  const updatePermissions = async () => {
    await refetchPermissions();
  };

  const updateSchema = (
    data: Record<string, any>,
    schemaType: 'contentType' | 'component',
    componentUID: Internal.UID.Schema
  ) => {
    dispatch(
      actions.updateSchema({
        data,
        schemaType,
        uid: componentUID,
      })
    );
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
        componentsGroupedByCategory: groupBy(components, 'category') as Record<string, any[]>,
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
        reservedNames,
        setModifiedData,
        sortedContentTypesList: sortContentType(contentTypes),
        submitData,
        updateSchema,
      }}
    >
      {children}
      {isInDevelopmentMode && <FormModal />}
    </DataManagerContext.Provider>
  );
};

// eslint-disable-next-line import/no-default-export
export default memo(DataManagerProvider);
