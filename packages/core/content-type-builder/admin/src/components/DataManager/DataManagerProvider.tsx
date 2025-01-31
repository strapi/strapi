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
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import set from 'lodash/set';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useLocation, useMatch } from 'react-router-dom';

import { pluginId } from '../../pluginId';
import { getTrad } from '../../utils/getTrad';
import { useAutoReloadOverlayBlocker } from '../AutoReloadOverlayBlocker';
import { useFormModalNavigation } from '../FormModalNavigation/useFormModalNavigation';

import { DataManagerContext, type DataManagerContextValue } from './DataManagerContext';
import { actions, initialState } from './reducer';
import { sortContentType } from './utils/cleanData';
import { createDataObject } from './utils/createDataObject';
import { formatSchemas } from './utils/formatSchemas';
import { retrieveComponentsThatHaveComponents } from './utils/retrieveComponentsThatHaveComponents';
import { retrieveNestedComponents } from './utils/retrieveNestedComponents';
import { retrieveSpecificInfoFromComponents } from './utils/retrieveSpecificInfoFromComponents';
import { serverRestartWatcher } from './utils/serverRestartWatcher';
import { validateSchema } from './utils/validateSchema';

import type {
  ContentType,
  SchemaType,
  Components,
  DataManagerStateType,
  Component,
} from '../../types';
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

const formatTypeForRequest = (type: ContentType | Component) => {
  let action;
  // should we do a diff with the initial data instead of trusting the state status ??
  switch (type.status) {
    case 'NEW':
      action = 'create';
      break;
    case 'CHANGED':
      action = 'update';
      break;
    case 'REMOVED':
      return { action: 'delete', uid: type.uid };
    default:
      throw new Error('Invalid status');
  }

  return {
    action,
    uid: type.uid,
    ...omit(type.schema, ['visible', 'uid', 'restrictRelationsTo', 'isTemporary']),
    attributes: type.schema.attributes
      .filter((attr) => {
        return attr.status !== 'UNCHANGED';
      })
      .map((attr) => {
        let action;
        // should we do a diff with the initial data instead of trusting the state status ??
        switch (attr.status) {
          case 'NEW':
            action = 'add';
            break;
          case 'CHANGED':
            action = 'modify';
            break;
          case 'REMOVED':
            return { action: 'delete', name: attr.name };
        }

        return {
          action,
          name: attr.name,
          properties: omit(attr, ['status']),
        };
      }),
  };
};

const selectState = (state: Record<string, unknown>) =>
  (state['content-type-builder_dataManagerProvider'] || initialState) as DataManagerStateType;

const DataManagerProvider = ({ children }: DataManagerProviderProps) => {
  const dispatch = useDispatch();
  // refactor
  const {
    components,
    contentTypes,
    isLoading,
    reservedNames,
    initialComponents,
    initialContentTypes,
  } = useSelector(selectState);

  const { toggleNotification } = useNotification();
  const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();
  // const { setCurrentStep, setStepState } = useGuidedTour('DataManagerProvider', (state) => state);

  const autoReload = useAppInfo('DataManagerProvider', (state) => state.autoReload);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const refetchPermissions = useAuth('DataManagerProvider', (state) => state.refetchPermissions);
  const { onCloseModal } = useFormModalNavigation();
  const contentTypeMatch = useMatch(`/plugins/${pluginId}/content-types/:uid`);
  const componentMatch = useMatch(
    `/plugins/${pluginId}/component-categories/:categoryUid/:componentUid`
  );

  const isModified = useMemo(() => {
    return !(isEqual(components, initialComponents) && isEqual(contentTypes, initialContentTypes));
  }, [components, contentTypes, initialComponents, initialContentTypes]);

  const fetchClient = useFetchClient();

  const isInDevelopmentMode = autoReload;

  const isInContentTypeView = contentTypeMatch !== null;
  const currentUid = isInContentTypeView
    ? get(contentTypeMatch, 'params.uid', null)
    : get(componentMatch, 'params.componentUid', null);

  const getDataRef = useRef<any>();

  getDataRef.current = async () => {
    try {
      const controller = new AbortController();
      const reqOpts = { signal: controller.signal };

      const [componentsResponse, contentTypesResponse, reservedNamesResponse] = await Promise.all([
        fetchClient.get(`/content-type-builder/components`, reqOpts),
        fetchClient.get(`/content-type-builder/content-types`, reqOpts),
        fetchClient.get(`/content-type-builder/reserved-names`, reqOpts),
      ]);

      const components = createDataObject(componentsResponse.data.data);
      const formattedComponents = formatSchemas<Component>(components);
      const contentTypes = createDataObject(contentTypesResponse.data.data);
      const formattedContentTypes = formatSchemas<ContentType>(contentTypes);

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
    if (!autoReload) {
      toggleNotification({
        type: 'info',
        message: formatMessage({ id: getTrad('notification.info.autoreaload-disable') }),
      });
    }
  }, [autoReload, toggleNotification, formatMessage]);

  const addAttribute: DataManagerContextValue['addAttribute'] = ({
    attributeToSet,
    forTarget,
    targetUid,
    isEditing = false,
    initialAttribute,
    shouldAddComponentToData = false,
  }) => {
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

  const addCreatedComponentToDynamicZone: DataManagerContextValue['addCreatedComponentToDynamicZone'] =
    ({ dynamicZoneTarget, componentsToAdd, forTarget, targetUid }) => {
      dispatch(
        actions.addCreatedComponentToDynamicZone({
          dynamicZoneTarget,
          componentsToAdd,
          forTarget,
          targetUid,
        })
      );
    };

  const createSchema: DataManagerContextValue['createSchema'] = ({
    data,
    schemaType,
    uid,
    componentCategory,
  }) => {
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
      };

      dispatch(actions.createComponentSchema(payload));
    }
  };

  const changeDynamicZoneComponents: DataManagerContextValue['changeDynamicZoneComponents'] = ({
    forTarget,
    targetUid,
    dynamicZoneTarget,
    newComponents,
  }) => {
    dispatch(
      actions.changeDynamicZoneComponents({
        forTarget,
        targetUid,
        dynamicZoneTarget,
        newComponents,
      })
    );
  };

  const removeAttribute: DataManagerContextValue['removeAttribute'] = ({
    forTarget,
    targetUid,
    attributeToRemoveName,
  }) => {
    if (forTarget === 'contentType') {
      trackUsage('willDeleteFieldOfContentType');
    }

    dispatch(
      actions.removeField({
        forTarget,
        targetUid,
        attributeToRemoveName,
      })
    );
  };

  const getAllComponentsThatHaveAComponentInTheirAttributes = () => {
    const composWithCompos = retrieveComponentsThatHaveComponents(components);

    return composWithCompos;
  };

  const getAllNestedComponents = () => {
    const appNestedCompo = retrieveNestedComponents(components);

    return appNestedCompo;
  };

  const removeComponentFromDynamicZone: DataManagerContextValue['removeComponentFromDynamicZone'] =
    ({ forTarget, targetUid, dzName, componentToRemoveIndex }) => {
      dispatch(
        actions.removeComponentFromDynamicZone({
          forTarget,
          targetUid,
          dzName,
          componentToRemoveIndex,
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

  const saveSchema = async () => {
    // TODO: validate schema

    // TODO: create POST request from state
    // - remove deleted attributes
    // - remove deleted components
    // - remove deleted content-types

    lockAppWithAutoreload?.();

    const res = await fetchClient.post(`/content-type-builder/update-schema`, {
      signal: null,
      data: {
        components: Object.values(components)
          .filter((compo) => {
            return compo.status !== 'UNCHANGED';
          })
          .map(formatTypeForRequest),
        contentTypes: Object.values(contentTypes)
          .filter((ct) => {
            return ct.status !== 'UNCHANGED';
          })
          .map(formatTypeForRequest),
      },
    });

    // if (
    //   isCreating &&
    //   (initialData.contentType?.schema.kind === 'collectionType' ||
    //     initialData.contentType?.schema.kind === 'singleType')
    // ) {
    //   setStepState('contentTypeBuilder.success', true);
    //   trackUsage('didCreateGuidedTourCollectionType');
    //   setCurrentStep(null);
    // }

    // Submit ct tracking success
    // if (isInContentTypeView) {
    //   trackUsage('didSaveContentType');
    //   const oldName = get(body, ['contentType', 'schema', 'name'], '');
    //   const newName = get(initialData, ['contentType', 'schema', 'name'], '');
    //   if (!isCreating && oldName !== newName) {
    //     trackUsage('didEditNameOfContentType');
    //   }
    // } else {
    //   trackUsage('didSaveComponent');
    // }

    // Make sure the server has restarted
    await serverRestartWatcher(true);

    // Unlock the app
    unlockAppWithAutoreload?.();
    // refetch and update initial state after the data has been saved

    await getDataRef.current();
    // Update the app's permissions
    await updatePermissions();

    // try {
    //   const isCreating = get(modifiedData, [firstKeyToMainSchema, 'isTemporary'], false);
    //   const body: {
    //     components: any[];
    //     contentType?: Record<string, any>;
    //     component?: any;
    //   } = {
    //     components: getComponentsToPost(
    //       modifiedData.components as Components,
    //       components as Components,
    //       currentUid as Internal.UID.Schema
    //     ),
    //   };
    //   if (isInContentTypeView) {
    //     const PluginForms = plugin?.apis?.forms as any;
    //     const contentType = PluginForms.mutateContentTypeSchema(
    //       {
    //         ...formatMainDataType(modifiedData.contentType),
    //         ...additionalContentTypeData,
    //       },
    //       initialData.contentType
    //     ) as ContentType;
    //     const isValidSchema = validateSchema(contentType);
    //     if (!isValidSchema) {
    //       toggleNotification({
    //         type: 'danger',
    //         message: formatMessage({
    //           id: getTrad('notification.error.dynamiczone-min.validation'),
    //           defaultMessage:
    //             'At least one component is required in a dynamic zone to be able to save a content type',
    //         }),
    //       });
    //       return;
    //     }
    //     body.contentType = contentType;
    //     trackUsage('willSaveContentType');
    //   } else {
    //     body.component = formatMainDataType(modifiedData.component, true);
    //     trackUsage('willSaveComponent');
    //   }
    //   // Lock the app
    //   lockAppWithAutoreload?.();
    //   const baseURL = `/${pluginId}/${endPoint}`;
    //   const requestURL = isCreating ? baseURL : `${baseURL}/${currentUid}`;
    //   if (isCreating) {
    //     await post(requestURL, body);
    //   } else {
    //     await put(requestURL, body);
    //   }
    //   if (
    //     isCreating &&
    //     (initialData.contentType?.schema.kind === 'collectionType' ||
    //       initialData.contentType?.schema.kind === 'singleType')
    //   ) {
    //     setStepState('contentTypeBuilder.success', true);
    //     trackUsage('didCreateGuidedTourCollectionType');
    //     setCurrentStep(null);
    //   }
    //   // Submit ct tracking success
    //   if (isInContentTypeView) {
    //     trackUsage('didSaveContentType');
    //     const oldName = get(body, ['contentType', 'schema', 'name'], '');
    //     const newName = get(initialData, ['contentType', 'schema', 'name'], '');
    //     if (!isCreating && oldName !== newName) {
    //       trackUsage('didEditNameOfContentType');
    //     }
    //   } else {
    //     trackUsage('didSaveComponent');
    //   }
    //   // Make sure the server has restarted
    //   await serverRestartWatcher(true);
    //   // Unlock the app
    //   unlockAppWithAutoreload?.();
    //   // refetch and update initial state after the data has been saved
    //   await getDataRef.current();
    //   // Update the app's permissions
    //   await updatePermissions();
    // } catch (err: any) {
    //   if (!isInContentTypeView) {
    //     trackUsage('didNotSaveComponent');
    //   }
    //   console.error({ err: err.response });
    //   toggleNotification({
    //     type: 'danger',
    //     message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
    //   });
    // } finally {
    //   unlockAppWithAutoreload?.();
    // }
  };

  const deleteComponent = (uid: Internal.UID.Component) => {
    const userConfirm = window.confirm(
      formatMessage({
        id: getTrad(`popUpWarning.bodyMessage.component.delete`),
      })
    );

    if (userConfirm) {
      onCloseModal();

      dispatch(actions.deleteComponent(uid));
    }
  };

  const deleteContentType = (uid: Internal.UID.ContentType) => {
    const userConfirm = window.confirm(
      formatMessage({
        id: getTrad(`popUpWarning.bodyMessage.contentType.delete`),
      })
    );

    if (userConfirm) {
      onCloseModal();

      dispatch(actions.deleteContentType(uid));
    }
  };

  const updatePermissions = async () => {
    await refetchPermissions();
  };

  const updateComponentSchema: DataManagerContextValue['updateComponentSchema'] = ({
    data,
    componentUID,
  }) => {
    dispatch(
      actions.updateComponentSchema({
        data,
        uid: componentUID,
      })
    );
  };

  const updateSchema: DataManagerContextValue['updateSchema'] = (args) => {
    dispatch(actions.updateSchema(args));
  };

  const applyChange: DataManagerContextValue['applyChange'] = (args) => {
    // TODO: validation step if necessary
    dispatch(actions.applyChange(args));
  };

  return (
    <DataManagerContext.Provider
      value={{
        addAttribute,
        addCustomFieldAttribute,
        addCreatedComponentToDynamicZone,
        allComponentsCategories: retrieveSpecificInfoFromComponents(components, ['category']),
        changeDynamicZoneComponents,
        initialComponents,
        components,
        componentsGroupedByCategory: groupBy(components, 'category') as Record<string, any[]>,
        componentsThatHaveOtherComponentInTheirAttributes:
          getAllComponentsThatHaveAComponentInTheirAttributes(),
        initialContentTypes,
        contentTypes,
        createSchema,
        deleteComponent,
        editCustomFieldAttribute,
        isInDevelopmentMode,
        isInContentTypeView,
        nestedComponents: getAllNestedComponents(),
        removeAttribute,
        removeComponentFromDynamicZone,
        reservedNames,
        sortedContentTypesList: sortContentType(contentTypes),
        updateComponentSchema,
        updateSchema,
        deleteContentType,
        saveSchema,
        isModified,
        applyChange,
      }}
    >
      {children}
    </DataManagerContext.Provider>
  );
};

// eslint-disable-next-line import/no-default-export
export default memo(DataManagerProvider);
