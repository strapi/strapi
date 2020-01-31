import React, { memo, useEffect, useReducer, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { camelCase, get, groupBy, set, size, sortBy } from 'lodash';
import {
  request,
  LoadingIndicatorPage,
  useGlobalContext,
  PopUpWarning,
} from 'strapi-helper-plugin';
import {
  useHistory,
  useLocation,
  useRouteMatch,
  Redirect,
} from 'react-router-dom';
import DataManagerContext from '../../contexts/DataManagerContext';
import getTrad from '../../utils/getTrad';
import makeUnique from '../../utils/makeUnique';
import pluginId from '../../pluginId';
import FormModal from '../FormModal';
import init from './init';
import reducer, { initialState } from './reducer';
import createDataObject from './utils/createDataObject';
import createModifiedDataSchema, {
  orderAllDataAttributesWithImmutable,
} from './utils/createModifiedDataSchema';
import retrieveSpecificInfoFromComponents from './utils/retrieveSpecificInfoFromComponents';
import retrieveComponentsFromSchema from './utils/retrieveComponentsFromSchema';
import retrieveNestedComponents from './utils/retrieveNestedComponents';
import { retrieveComponentsThatHaveComponents } from './utils/retrieveComponentsThatHaveComponents';
import {
  getComponentsToPost,
  formatMainDataType,
  getCreatedAndModifiedComponents,
} from './utils/cleanData';

const DataManagerProvider = ({ allIcons, children }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const [infoModals, toggleInfoModal] = useState({ cancel: false });
  const {
    autoReload,
    currentEnvironment,
    emitEvent,
    formatMessage,
    updatePlugin,
  } = useGlobalContext();
  const {
    components,
    contentTypes,
    isLoading,
    isLoadingForDataToBeSet,
    initialData,
    modifiedData,
  } = reducerState.toJS();
  const { pathname } = useLocation();
  const { push } = useHistory();
  const contentTypeMatch = useRouteMatch(
    `/plugins/${pluginId}/content-types/:uid`
  );
  const componentMatch = useRouteMatch(
    `/plugins/${pluginId}/component-categories/:categoryUid/:componentUid`
  );
  const formatMessageRef = useRef();
  formatMessageRef.current = formatMessage;
  const isInDevelopmentMode =
    currentEnvironment === 'development' && autoReload;

  const isInContentTypeView = contentTypeMatch !== null;
  const firstKeyToMainSchema = isInContentTypeView
    ? 'contentType'
    : 'component';
  const currentUid = isInContentTypeView
    ? get(contentTypeMatch, 'params.uid', null)
    : get(componentMatch, 'params.componentUid', null);
  const abortController = new AbortController();
  const { signal } = abortController;
  const getDataRef = useRef();
  const endPoint = isInContentTypeView ? 'content-types' : 'components';

  getDataRef.current = async () => {
    try {
      const [
        { data: componentsArray },
        { data: contentTypesArray },
      ] = await Promise.all(
        ['components', 'content-types'].map(endPoint => {
          return request(`/${pluginId}/${endPoint}`, {
            method: 'GET',
            signal,
          });
        })
      );

      const components = createDataObject(componentsArray);
      const contentTypes = createDataObject(contentTypesArray);
      const orderedComponents = orderAllDataAttributesWithImmutable({
        components,
      });
      const orderedContenTypes = orderAllDataAttributesWithImmutable({
        components: contentTypes,
      });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        components: orderedComponents.get('components'),
        contentTypes: orderedContenTypes.get('components'),
      });
    } catch (err) {
      console.error({ err });
      strapi.notification.error('notification.error');
    }
  };

  useEffect(() => {
    getDataRef.current();
  }, []);

  useEffect(() => {
    // We need to set the modifiedData after the data has been retrieved
    // and also on pathname change
    if (!isLoading) {
      setModifiedData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, pathname]);

  useEffect(() => {
    if (currentEnvironment === 'development' && !autoReload) {
      strapi.notification.info(
        formatMessageRef.current({
          id: getTrad('notification.info.autoreaload-disable'),
        })
      );
    }
  }, [autoReload, currentEnvironment]);

  const didModifiedComponents =
    getCreatedAndModifiedComponents(modifiedData.components || {}, components)
      .length > 0;

  const addAttribute = (
    attributeToSet,
    forTarget,
    targetUid,
    isEditing = false,
    initialAttribute,
    shouldAddComponentToData = false
  ) => {
    const actionType = isEditing ? 'EDIT_ATTRIBUTE' : 'ADD_ATTRIBUTE';

    dispatch({
      type: actionType,
      attributeToSet,
      forTarget,
      targetUid,
      initialAttribute,
      shouldAddComponentToData,
    });
  };

  const addCreatedComponentToDynamicZone = (
    dynamicZoneTarget,
    componentsToAdd
  ) => {
    dispatch({
      type: 'ADD_CREATED_COMPONENT_TO_DYNAMIC_ZONE',
      dynamicZoneTarget,
      componentsToAdd,
    });
  };

  const cancelChanges = () => {
    toggleModalCancel();
    dispatch({ type: 'CANCEL_CHANGES' });
  };

  const createSchema = (
    data,
    schemaType,
    uid,
    componentCategory,
    shouldAddComponentToData = false
  ) => {
    const type =
      schemaType === 'contentType'
        ? 'CREATE_SCHEMA'
        : 'CREATE_COMPONENT_SCHEMA';

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
      type: 'CHANGE_DYNAMIC_ZONE_COMPONENTS',
      dynamicZoneTarget,
      newComponents,
    });
  };

  const removeAttribute = (
    mainDataKey,
    attributeToRemoveName,
    componentUid = ''
  ) => {
    const type =
      mainDataKey === 'components'
        ? 'REMOVE_FIELD_FROM_DISPLAYED_COMPONENT'
        : 'REMOVE_FIELD';

    if (mainDataKey === 'contentType') {
      emitEvent('willDeleteFieldOfContentType');
    }

    dispatch({
      type,
      mainDataKey,
      attributeToRemoveName,
      componentUid,
    });
  };

  const deleteCategory = async categoryUid => {
    try {
      const requestURL = `/${pluginId}/component-categories/${categoryUid}`;
      const userConfirm = window.confirm(
        formatMessage({
          id: getTrad('popUpWarning.bodyMessage.category.delete'),
        })
      );
      // Close the modal
      push({ search: '' });

      if (userConfirm) {
        await request(requestURL, { method: 'DELETE' }, true);
        // Reload the plugin so the cycle is new again
        dispatch({ type: 'RELOAD_PLUGIN' });
        // Refetch all the data
        getDataRef.current();
      }
    } catch (err) {
      console.error({ err });
      strapi.notification.error('notification.error');
    }
  };

  const deleteData = async () => {
    try {
      const requestURL = `/${pluginId}/${endPoint}/${currentUid}`;
      const isTemporary = get(
        modifiedData,
        [firstKeyToMainSchema, 'isTemporary'],
        false
      );
      const userConfirm = window.confirm(
        formatMessage({
          id: getTrad(
            `popUpWarning.bodyMessage.${
              isInContentTypeView ? 'contentType' : 'component'
            }.delete`
          ),
        })
      );

      // Close the modal
      push({ search: '' });

      if (userConfirm) {
        if (isTemporary) {
          // Delete the not saved type
          // Here we just need to reset the components to the initial ones and also the content types
          // Doing so will trigging a url change since the type doesn't exist in either the contentTypes or the components
          // so the modified and the initial data will also be reset in the useEffect...
          dispatch({ type: 'DELETE_NOT_SAVED_TYPE' });

          return;
        }

        await request(requestURL, { method: 'DELETE' }, true);

        // Reload the plugin so the cycle is new again
        dispatch({ type: 'RELOAD_PLUGIN' });

        // Update the app menu
        await updateAppMenu();
        // Refetch all the data
        getDataRef.current();
      }
    } catch (err) {
      console.error({ err });
      strapi.notification.error('notification.error');
    }
  };

  const editCategory = async (categoryUid, body) => {
    try {
      const requestURL = `/${pluginId}/component-categories/${categoryUid}`;

      // Close the modal
      push({ search: '' });

      // Update the category
      await request(requestURL, { method: 'PUT', body }, true);

      // Reload the plugin so the cycle is new again
      dispatch({ type: 'RELOAD_PLUGIN' });
      // Refetch all the data
      getDataRef.current();
    } catch (err) {
      console.error({ err });
      strapi.notification.error('notification.error');
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

    return makeUnique(composWithCompos);
  };

  const getAllNestedComponents = () => {
    const appNestedCompo = retrieveNestedComponents(components);
    const editingDataNestedCompos = retrieveNestedComponents(
      modifiedData.components || {}
    );

    return makeUnique([...editingDataNestedCompos, ...appNestedCompo]);
  };

  const removeComponentFromDynamicZone = (dzName, componentToRemoveIndex) => {
    dispatch({
      type: 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE',
      dzName,
      componentToRemoveIndex,
    });
  };

  const setModifiedData = () => {
    const currentSchemas = isInContentTypeView ? contentTypes : components;
    const schemaToSet = get(currentSchemas, currentUid, {
      schema: { attributes: {} },
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

    const dataShape = orderAllDataAttributesWithImmutable(
      newSchemaToSet,
      isInContentTypeView
    );

    // This prevents from losing the created content type or component when clicking on the link from the left menu
    const hasJustCreatedSchema =
      get(schemaToSet, 'isTemporary', false) &&
      size(get(schemaToSet, 'schema.attributes', {})) === 0;

    dispatch({
      type: 'SET_MODIFIED_DATA',
      schemaToSet: dataShape,
      hasJustCreatedSchema,
    });
  };

  const sortedContentTypesList = sortBy(
    Object.keys(contentTypes)
      .map(uid => ({
        name: uid,
        title: contentTypes[uid].schema.name,
        uid,
        to: `/plugins/${pluginId}/content-types/${uid}`,
      }))
      .filter(obj => obj !== null),
    obj => camelCase(obj.title)
  );

  const shouldRedirect = () => {
    const dataSet = isInContentTypeView ? contentTypes : components;

    return !Object.keys(dataSet).includes(currentUid) && !isLoading;
  };

  if (shouldRedirect()) {
    const firstCTUid = Object.keys(contentTypes).sort()[0];

    return <Redirect to={`/plugins/${pluginId}/content-types/${firstCTUid}`} />;
  }

  const submitData = async () => {
    try {
      const isCreating = get(
        modifiedData,
        [firstKeyToMainSchema, 'isTemporary'],
        false
      );
      const body = {
        components: getComponentsToPost(
          modifiedData.components,
          components,
          currentUid,
          isCreating
        ),
      };

      if (isInContentTypeView) {
        body.contentType = formatMainDataType(modifiedData.contentType);

        emitEvent('willSaveContentType');
      } else {
        body.component = formatMainDataType(modifiedData.component, true);

        emitEvent('willSaveComponent');
      }

      const method = isCreating ? 'POST' : 'PUT';

      const baseURL = `/${pluginId}/${endPoint}`;
      const requestURL = isCreating ? baseURL : `${baseURL}/${currentUid}`;

      await request(requestURL, { method, body }, true);
      // Update the app menu
      await updateAppMenu();

      // Submit ct tracking success
      if (isInContentTypeView) {
        emitEvent('didSaveContentType');

        const oldName = get(body, ['contentType', 'schema', 'name'], '');
        const newName = get(initialData, ['contentType', 'schema', 'name'], '');

        if (!isCreating && oldName !== newName) {
          emitEvent('didEditNameOfContentType');
        }
      } else {
        emitEvent('didSaveComponent');
      }

      // Reload the plugin so the cycle is new again
      dispatch({ type: 'RELOAD_PLUGIN' });
      // Refetch all the data
      getDataRef.current();
    } catch (err) {
      if (!isInContentTypeView) {
        emitEvent('didNotSaveComponent');
      }
      console.error({ err });
      strapi.notification.error('notification.error');
    }
  };

  // Open the modal warning cancel changes
  const toggleModalCancel = () => {
    toggleInfoModal(prev => ({ ...prev, cancel: !prev.cancel }));
  };

  // Really temporary until menu API
  const updateAppMenu = async () => {
    const requestURL = '/content-manager/content-types';

    try {
      const { data } = await request(requestURL, { method: 'GET' });

      const menu = [{ name: 'Content Types', links: data }];

      updatePlugin('content-manager', 'leftMenuSections', menu);
    } catch (err) {
      console.error({ err });
      strapi.notification.error('notification.error');
    }
  };

  const updateSchema = (data, schemaType, componentUID) => {
    dispatch({
      type: 'UPDATE_SCHEMA',
      data,
      schemaType,
      uid: componentUID,
    });
  };

  return (
    <DataManagerContext.Provider
      value={{
        addAttribute,
        addCreatedComponentToDynamicZone,
        allComponentsCategories: retrieveSpecificInfoFromComponents(
          components,
          ['category']
        ),
        allComponentsIconAlreadyTaken: retrieveSpecificInfoFromComponents(
          components,
          ['schema', 'icon']
        ),
        allIcons,
        changeDynamicZoneComponents,
        components,
        componentsGroupedByCategory: groupBy(components, 'category'),
        componentsThatHaveOtherComponentInTheirAttributes: getAllComponentsThatHaveAComponentInTheirAttributes(),
        contentTypes,
        createSchema,
        deleteCategory,
        deleteData,
        editCategory,
        isInDevelopmentMode,
        initialData,
        isInContentTypeView,
        modifiedData,
        nestedComponents: getAllNestedComponents(),
        removeAttribute,
        removeComponentFromDynamicZone,
        setModifiedData,
        sortedContentTypesList,
        submitData,
        toggleModalCancel,
        updateSchema,
      }}
    >
      {isLoadingForDataToBeSet ? (
        <LoadingIndicatorPage />
      ) : (
        <>
          {children}
          {isInDevelopmentMode && (
            <>
              <FormModal />
              <PopUpWarning
                isOpen={infoModals.cancel}
                toggleModal={toggleModalCancel}
                content={{
                  message: getTrad(
                    `popUpWarning.bodyMessage.cancel-modifications${
                      didModifiedComponents ? '.with-components' : ''
                    }`
                  ),
                }}
                popUpWarningType="danger"
                onConfirm={() => {
                  cancelChanges();
                }}
              />
            </>
          )}
        </>
      )}
    </DataManagerContext.Provider>
  );
};

DataManagerProvider.propTypes = {
  allIcons: PropTypes.array.isRequired,
  children: PropTypes.node.isRequired,
};

export default memo(DataManagerProvider);
