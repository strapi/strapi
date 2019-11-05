import React, { useEffect, useReducer } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import {
  getQueryParameters,
  request,
  LoadingIndicatorPage,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import EditViewDataManagerContext from '../../contexts/EditViewDataManager';
import createYupSchema from './utils/schema';
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
  const { search } = useLocation();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const {
    formErrors,
    initialData,
    isLoading,
    modifiedData,
    shouldShowLoadingState,
  } = reducerState.toJS();

  const currentContentTypeLayout = get(allLayoutData, ['contentType'], {});
  const abortController = new AbortController();
  const { signal } = abortController;
  const isCreatingEntry = id === 'create';
  const source = getQueryParameters(search, 'source');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await request(getRequestUrl(`${slug}/${id}`), {
          method: 'GET',
          params: { source },
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

    // Force state to be cleared when navigation from one entry to another
    dispatch({ type: 'RESET_PROPS' });

    if (!isCreatingEntry) {
      fetchData();
    } else {
      // Will create default form
      console.log('will create default form');
    }

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug, source]);

  const addComponentToDynamicZone = (keys, componentUid) => {
    dispatch({
      type: 'ADD_COMPONENT_TO_DYNAMIC_ZONE',
      keys: keys.split('.'),
      componentUid,
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

  const addRepeatableComponentToField = keys => {
    dispatch({
      type: 'ADD_REPEATABLE_COMPONENT_TO_FIELD',
      keys: keys.split('.'),
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

  const handleSubmit = async e => {
    e.preventDefault();

    const schema = createYupSchema(currentContentTypeLayout, {
      components: get(allLayoutData, 'components', {}),
    });

    try {
      // Validate the form using yup
      await schema.validate(modifiedData, { abortEarly: false });
      // Set the loading state in the plugin header
      setIsSubmitting();
    } catch (err) {
      const errors = get(err, 'inner', []).reduce((acc, curr) => {
        acc[
          curr.path
            .split('[')
            .join('.')
            .split(']')
            .join('')
        ] = { id: curr.message };

        return acc;
      }, {});
      dispatch({
        type: 'SUBMIT_ERRORS',
        errors,
      });
      console.log({ errors });
    }
    // dispatch({
    //   type: 'SUBMIT_SUCCEEDED',
    // });
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

  // REMOVE_COMPONENT_FROM_FIELD

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

  console.log({ modifiedData });

  return (
    <EditViewDataManagerContext.Provider
      value={{
        addComponentToDynamicZone,
        addNonRepeatableComponentToField,
        addRelation,
        addRepeatableComponentToField,
        allLayoutData,
        formErrors,
        initialData,
        layout: currentContentTypeLayout,
        modifiedData,
        moveComponentField,
        moveRelation,
        onChange: handleChange,
        onRemoveRelation,
        redirectToPreviousPage,
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
        source,
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
