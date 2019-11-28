import React, { memo, useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import { get, groupBy, sortBy } from 'lodash';
import { request, LoadingIndicatorPage } from 'strapi-helper-plugin';
import { useLocation, useRouteMatch, Redirect } from 'react-router-dom';
import DataManagerContext from '../../contexts/DataManagerContext';
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

const DataManagerProvider = ({ allIcons, children }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const {
    components,
    contentTypes,
    isLoading,
    isLoadingForDataToBeSet,
    initialData,
    modifiedData,
  } = reducerState.toJS();
  const { pathname } = useLocation();
  const contentTypeMatch = useRouteMatch(
    `/plugins/${pluginId}/content-types/:uid`
  );
  const componentMatch = useRouteMatch(
    `/plugins/${pluginId}/component-categories/:categoryUid/:componentUid`
  );
  const isInContentTypeView = contentTypeMatch !== null;
  const currentUid = isInContentTypeView
    ? get(contentTypeMatch, 'params.uid', null)
    : get(componentMatch, 'params.componentUid', null);
  const abortController = new AbortController();
  const { signal } = abortController;
  const getDataRef = useRef();

  getDataRef.current = async () => {
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

    dispatch({
      type: 'GET_DATA_SUCCEEDED',
      components,
      contentTypes,
    });
  };

  useEffect(() => {
    getDataRef.current();
  }, []);

  useEffect(() => {
    // We need to set the modifiedData after the data has been retrieved
    //and also on pathname change
    if (!isLoading) {
      setModifiedData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, pathname]);

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

    dispatch({
      type,
      mainDataKey,
      attributeToRemoveName,
      componentUid,
    });
  };

  const removeComponentFromDynamicZone = (dzName, componentToRemoveIndex) => {
    dispatch({
      type: 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE',
      dzName,
      componentToRemoveIndex,
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
    obj => obj.title
  );

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

    dispatch({
      type: 'SET_MODIFIED_DATA',
      schemaToSet: dataShape,
    });
  };
  const shouldRedirect = () => {
    const dataSet = isInContentTypeView ? contentTypes : components;

    return !Object.keys(dataSet).includes(currentUid) && !isLoading;
  };

  if (shouldRedirect()) {
    const firstCTUid = Object.keys(contentTypes).sort()[0];

    return <Redirect to={`/plugins/${pluginId}/content-types/${firstCTUid}`} />;
  }

  console.log({ modifiedData, components });
  console.log(retrieveNestedComponents(components));

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
        contentTypes,
        createSchema,
        initialData,
        isInContentTypeView,
        modifiedData,
        nestedComponents: retrieveNestedComponents(components),
        removeAttribute,
        removeComponentFromDynamicZone,
        setModifiedData,
        sortedContentTypesList,
      }}
    >
      {isLoadingForDataToBeSet ? (
        <LoadingIndicatorPage />
      ) : (
        <>
          {children}
          <FormModal />
          <button type="button" onClick={() => dispatch({ type: 'TEST' })}>
            click
          </button>
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
