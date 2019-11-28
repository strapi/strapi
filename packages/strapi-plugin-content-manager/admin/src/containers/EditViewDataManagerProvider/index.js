import React, { useEffect, useReducer } from 'react';
import { useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { cloneDeep, get, isEmpty, set } from 'lodash';
import {
  request,
  LoadingIndicatorPage,
  useGlobalContext,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import EditViewDataManagerContext from '../../contexts/EditViewDataManager';
import createYupSchema from './utils/schema';
import createDefaultForm from './utils/createDefaultForm';
import getFilesToUpload from './utils/getFilesToUpload';
import cleanData from './utils/cleanData';
import getYupInnerErrors from './utils/getYupInnerErrors';
import init from './init';
import reducer, { initialState } from './reducer';

const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

const EditViewDataManagerProvider = ({
  allLayoutData,
  children,
  redirectToPreviousPage,
  slug,
}) => {
  const { id } = useParams();
  // Retrieve the search
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const {
    formErrors,
    initialData,
    isLoading,
    modifiedData,
    shouldShowLoadingState,
    shouldCheckErrors,
  } = reducerState.toJS();

  const currentContentTypeLayout = get(allLayoutData, ['contentType'], {});
  const abortController = new AbortController();
  const { signal } = abortController;
  const isCreatingEntry = id === 'create';

  useEffect(() => {
    if (!isLoading) {
      checkFormErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCheckErrors]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await request(getRequestUrl(`${slug}/${id}`), {
          method: 'GET',
          signal,
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        if (err.code !== 20) {
          strapi.notification.error(`${pluginId}.error.record.fetch`);
        }
      }
    };

    const componentsDataStructure = Object.keys(
      allLayoutData.components
    ).reduce((acc, current) => {
      acc[current] = createDefaultForm(
        get(allLayoutData, ['components', current, 'schema', 'attributes'], {}),
        allLayoutData.components
      );
      return acc;
    }, {});
    const contentTypeDataStructure = createDefaultForm(
      currentContentTypeLayout.schema.attributes,
      allLayoutData.components
    );

    // Force state to be cleared when navigation from one entry to another
    dispatch({ type: 'RESET_PROPS' });
    dispatch({
      type: 'SET_DEFAULT_DATA_STRUCTURES',
      componentsDataStructure,
      contentTypeDataStructure,
    });

    if (!isCreatingEntry) {
      fetchData();
    } else {
      // Will create default form
      dispatch({
        type: 'SET_DEFAULT_MODIFIED_DATA_STRUCTURE',
        contentTypeDataStructure,
      });
    }

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug]);

  const addComponentToDynamicZone = (
    keys,
    componentUid,
    shouldCheckErrors = false
  ) => {
    dispatch({
      type: 'ADD_COMPONENT_TO_DYNAMIC_ZONE',
      keys: keys.split('.'),
      componentUid,
      shouldCheckErrors,
    });
  };

  const addNonRepeatableComponentToField = (keys, componentUid) => {
    dispatch({
      type: 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD',
      keys: keys.split('.'),
      componentUid,
    });
  };

  const addRelation = ({ target: { name, value } }) => {
    dispatch({
      type: 'ADD_RELATION',
      keys: name.split('.'),
      value,
    });
  };

  const addRepeatableComponentToField = (
    keys,
    componentUid,
    shouldCheckErrors = false
  ) => {
    dispatch({
      type: 'ADD_REPEATABLE_COMPONENT_TO_FIELD',
      keys: keys.split('.'),
      componentUid,
      shouldCheckErrors,
    });
  };

  const checkFormErrors = async (dataToSet = {}) => {
    const schema = createYupSchema(currentContentTypeLayout, {
      components: get(allLayoutData, 'components', {}),
    });
    let errors = {};
    const updatedData = cloneDeep(modifiedData);

    if (!isEmpty(updatedData)) {
      set(updatedData, dataToSet.path, dataToSet.value);
    }

    try {
      // Validate the form using yup
      await schema.validate(updatedData, { abortEarly: false });
    } catch (err) {
      errors = getYupInnerErrors(err);
    }

    dispatch({
      type: 'SET_ERRORS',
      errors,
    });
  };

  const handleChange = ({ target: { name, value, type } }) => {
    let inputValue = value;

    // Empty string is not a valid date,
    // Set the date to null when it's empty
    if (type === 'date' && value === '') {
      inputValue = null;
    }

    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value: inputValue,
    });
  };

  const { emitEvent } = useGlobalContext();

  const handleSubmit = async e => {
    e.preventDefault();

    // Create yup schema
    const schema = createYupSchema(currentContentTypeLayout, {
      components: get(allLayoutData, 'components', {}),
    });

    try {
      // Validate the form using yup
      await schema.validate(modifiedData, { abortEarly: false });
      // Set the loading state in the plugin header
      const filesToUpload = getFilesToUpload(modifiedData);
      // Remove keys that are not needed
      // Clean relations
      const cleanedData = cleanData(
        cloneDeep(modifiedData),
        currentContentTypeLayout,
        allLayoutData.components
      );

      const formData = new FormData();

      formData.append('data', JSON.stringify(cleanedData));

      Object.keys(filesToUpload).forEach(key => {
        const files = filesToUpload[key];

        files.forEach(file => {
          formData.append(`files.${key}`, file);
        });
      });

      // Change the request helper default headers so we can pass a FormData
      const headers = {};
      const method = isCreatingEntry ? 'POST' : 'PUT';
      const endPoint = isCreatingEntry ? slug : `${slug}/${id}`;

      emitEvent(isCreatingEntry ? 'willCreateEntry' : 'willEditEntry');

      try {
        // Time to actually send the data
        await request(
          getRequestUrl(endPoint),
          {
            method,
            headers,
            body: formData,
            signal,
          },
          false,
          false
        );
        emitEvent(isCreatingEntry ? 'didCreateEntry' : 'didEditEntry');
        redirectToPreviousPage();
      } catch (err) {
        console.log({ err });
        const error = get(
          err,
          ['response', 'payload', 'message', '0', 'messages', '0', 'id'],
          'SERVER ERROR'
        );

        setIsSubmitting(false);
        emitEvent(isCreatingEntry ? 'didNotCreateEntry' : 'didNotEditEntry', {
          error: err,
        });
        strapi.notification.error(error);
      }
    } catch (err) {
      const errors = getYupInnerErrors(err);

      dispatch({
        type: 'SUBMIT_ERRORS',
        errors,
      });
    }
  };

  const moveComponentDown = (dynamicZoneName, currentIndex) => {
    dispatch({
      type: 'MOVE_COMPONENT_DOWN',
      dynamicZoneName,
      currentIndex,
    });
  };
  const moveComponentUp = (dynamicZoneName, currentIndex) => {
    dispatch({
      type: 'MOVE_COMPONENT_UP',
      dynamicZoneName,
      currentIndex,
    });
  };
  const moveComponentField = (pathToComponent, dragIndex, hoverIndex) => {
    dispatch({
      type: 'MOVE_COMPONENT_FIELD',
      pathToComponent,
      dragIndex,
      hoverIndex,
    });
  };

  const moveRelation = (dragIndex, overIndex, name) => {
    dispatch({
      type: 'MOVE_FIELD',
      dragIndex,
      overIndex,
      keys: name.split('.'),
    });
  };

  const onRemoveRelation = keys => {
    dispatch({
      type: 'REMOVE_RELATION',
      keys,
    });
  };

  const removeComponentFromDynamicZone = (dynamicZoneName, index) => {
    dispatch({
      type: 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE',
      dynamicZoneName,
      index,
    });
  };
  const removeComponentFromField = (keys, componentUid) => {
    dispatch({
      type: 'REMOVE_COMPONENT_FROM_FIELD',
      keys: keys.split('.'),
      componentUid,
    });
  };

  const removeRepeatableField = (keys, componentUid) => {
    dispatch({
      type: 'REMOVE_REPEATABLE_FIELD',
      keys: keys.split('.'),
      componentUid,
    });
  };

  const setIsSubmitting = (value = true) => {
    dispatch({ type: 'IS_SUBMITTING', value });
  };

  const showLoader = !isCreatingEntry && isLoading;

  return (
    <EditViewDataManagerContext.Provider
      value={{
        addComponentToDynamicZone,
        addNonRepeatableComponentToField,
        addRelation,
        addRepeatableComponentToField,
        allLayoutData,
        checkFormErrors,
        formErrors,
        initialData,
        layout: currentContentTypeLayout,
        modifiedData,
        moveComponentDown,
        moveComponentField,
        moveComponentUp,
        moveRelation,
        onChange: handleChange,
        onRemoveRelation,
        redirectToPreviousPage,
        removeComponentFromDynamicZone,
        removeComponentFromField,
        removeRepeatableField,
        resetData: () => {
          dispatch({
            type: 'RESET_DATA',
          });
        },
        setIsSubmitting,
        shouldShowLoadingState,
        slug,
      }}
    >
      {showLoader ? (
        <LoadingIndicatorPage />
      ) : (
        <form onSubmit={handleSubmit}>{children}</form>
      )}
    </EditViewDataManagerContext.Provider>
  );
};

EditViewDataManagerProvider.defaultProps = {
  redirectToPreviousPage: () => {},
};

EditViewDataManagerProvider.propTypes = {
  allLayoutData: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
  redirectToPreviousPage: PropTypes.func,
  slug: PropTypes.string.isRequired,
};

export default EditViewDataManagerProvider;
