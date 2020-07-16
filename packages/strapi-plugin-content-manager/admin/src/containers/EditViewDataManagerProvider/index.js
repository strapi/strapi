import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { cloneDeep, get, isEmpty, isEqual, pick, set } from 'lodash';
import PropTypes from 'prop-types';
import { Prompt, Redirect, useParams, useLocation, useHistory } from 'react-router-dom';
import {
  LoadingIndicatorPage,
  request,
  useGlobalContext,
  findMatchingPermissions,
  useUser,
  useUserPermissions,
  OverlayBlocker,
} from 'strapi-helper-plugin';
import EditViewDataManagerContext from '../../contexts/EditViewDataManager';
import { generatePermissionsObject, getTrad } from '../../utils';
import pluginId from '../../pluginId';
import init from './init';
import reducer, { initialState } from './reducer';
import {
  cleanData,
  createDefaultForm,
  createYupSchema,
  getYupInnerErrors,
  getFilesToUpload,
  removePasswordFieldsFromData,
} from './utils';

const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

const EditViewDataManagerProvider = ({
  allLayoutData,
  children,
  isSingleType,
  redirectToPreviousPage,
  slug,
}) => {
  const { id } = useParams();
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { state } = useLocation();

  const { push } = useHistory();
  // Here in case of a 403 response when fetching data we will either redirect to the previous page
  // Or to the homepage if there's no state in the history stack
  const from = get(state, 'from', '/');
  const {
    formErrors,
    initialData,
    isLoading,
    modifiedData,
    modifiedDZName,
    shouldCheckErrors,
  } = reducerState.toJS();
  const [isCreatingEntry, setIsCreatingEntry] = useState(id === 'create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentContentTypeLayout = get(allLayoutData, ['contentType'], {});
  // This is used for the readonly mode when updating an entry
  const allDynamicZoneFields = useMemo(() => {
    const attributes = get(currentContentTypeLayout, ['schema', 'attributes'], {});

    const dynamicZoneFields = Object.keys(attributes).filter(attrName => {
      return get(attributes, [attrName, 'type'], '') === 'dynamiczone';
    });

    return dynamicZoneFields;
  }, [currentContentTypeLayout]);

  const abortController = new AbortController();
  const { signal } = abortController;
  const { emitEvent, formatMessage } = useGlobalContext();
  const userPermissions = useUser();
  const generatedPermissions = useMemo(() => generatePermissionsObject(slug), [slug]);

  const permissionsToApply = useMemo(() => {
    const fieldsToPick = isCreatingEntry ? ['create'] : ['read', 'update'];

    return pick(generatedPermissions, fieldsToPick);
  }, [isCreatingEntry, generatedPermissions]);
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canCreate, canRead, canUpdate },
  } = useUserPermissions(permissionsToApply);
  const createActionAllowedFields = useMemo(() => {
    const matchingPermissions = findMatchingPermissions(userPermissions, [
      {
        action: 'plugins::content-manager.explorer.create',
        subject: slug,
      },
    ]);

    return get(matchingPermissions, ['0', 'fields'], []);
  }, [userPermissions, slug]);

  const shouldRedirectToHomepageWhenCreatingEntry = useMemo(() => {
    if (isLoadingForPermissions || isLoading) {
      return false;
    }

    if (!isCreatingEntry) {
      return false;
    }

    if (canCreate === false) {
      return true;
    }

    return false;
  }, [isLoadingForPermissions, isCreatingEntry, canCreate, isLoading]);

  const shouldRedirectToHomepageWhenEditingEntry = useMemo(() => {
    if (isLoadingForPermissions || isLoading) {
      return false;
    }

    if (isCreatingEntry) {
      return false;
    }

    if (canRead === false && canUpdate === false) {
      return true;
    }

    return false;
  }, [isLoadingForPermissions, isLoading, isCreatingEntry, canRead, canUpdate]);

  const readActionAllowedFields = useMemo(() => {
    const matchingPermissions = findMatchingPermissions(userPermissions, [
      {
        action: 'plugins::content-manager.explorer.read',
        subject: slug,
      },
    ]);

    return get(matchingPermissions, ['0', 'fields'], []);
  }, [slug, userPermissions]);

  const updateActionAllowedFields = useMemo(() => {
    const matchingPermissions = findMatchingPermissions(userPermissions, [
      {
        action: 'plugins::content-manager.explorer.update',
        subject: slug,
      },
    ]);

    return get(matchingPermissions, ['0', 'fields'], []);
  }, [slug, userPermissions]);

  useEffect(() => {
    if (!isLoading) {
      checkFormErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCheckErrors]);

  useEffect(() => {
    if (shouldRedirectToHomepageWhenEditingEntry) {
      strapi.notification.info(getTrad('permissions.not-allowed.update'));
    }
  }, [shouldRedirectToHomepageWhenEditingEntry]);

  useEffect(() => {
    if (shouldRedirectToHomepageWhenCreatingEntry) {
      strapi.notification.info(getTrad('permissions.not-allowed.create'));
    }
  }, [shouldRedirectToHomepageWhenCreatingEntry]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await request(getRequestUrl(`${slug}/${id || ''}`), {
          method: 'GET',
          signal,
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: removePasswordFieldsFromData(
            data,
            allLayoutData.contentType,
            allLayoutData.components
          ),
        });
      } catch (err) {
        console.log(err);
        const status = get(err, 'response.status', null);

        if (id && status === 403) {
          strapi.notification.info(getTrad('permissions.not-allowed.update'));

          push(from);

          return;
        }

        if (id && err.code !== 20) {
          strapi.notification.error(`${pluginId}.error.record.fetch`);
        }

        // Create a single type
        if (!id && status === 404) {
          setIsCreatingEntry(true);

          return;
        }

        // Not allowed to update or read a ST
        if (!id && status === 403) {
          strapi.notification.info(getTrad('permissions.not-allowed.update'));

          push(from);
        }
      }
    };

    const componentsDataStructure = Object.keys(allLayoutData.components).reduce((acc, current) => {
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

    if (!isLoadingForPermissions) {
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
    }

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug, isCreatingEntry, isLoadingForPermissions]);

  const addComponentToDynamicZone = useCallback((keys, componentUid, shouldCheckErrors = false) => {
    emitEvent('addComponentToDynamicZone');
    dispatch({
      type: 'ADD_COMPONENT_TO_DYNAMIC_ZONE',
      keys: keys.split('.'),
      componentUid,
      shouldCheckErrors,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addNonRepeatableComponentToField = useCallback((keys, componentUid) => {
    dispatch({
      type: 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD',
      keys: keys.split('.'),
      componentUid,
    });
  }, []);

  const addRelation = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'ADD_RELATION',
      keys: name.split('.'),
      value,
    });
  }, []);

  const addRepeatableComponentToField = useCallback(
    (keys, componentUid, shouldCheckErrors = false) => {
      dispatch({
        type: 'ADD_REPEATABLE_COMPONENT_TO_FIELD',
        keys: keys.split('.'),
        componentUid,
        shouldCheckErrors,
      });
    },
    []
  );

  const checkFormErrors = async (dataToSet = {}) => {
    const schema = createYupSchema(
      currentContentTypeLayout,
      {
        components: get(allLayoutData, 'components', {}),
      },
      isCreatingEntry
    );
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

      if (modifiedDZName) {
        errors = Object.keys(errors).reduce((acc, current) => {
          const dzName = current.split('.')[0];

          if (dzName !== modifiedDZName) {
            acc[current] = errors[current];
          }

          return acc;
        }, {});
      }
    }

    dispatch({
      type: 'SET_ERRORS',
      errors,
    });
  };

  const handleChange = useCallback(
    ({ target: { name, value, type } }, shouldSetInitialValue = false) => {
      let inputValue = value;

      // Empty string is not a valid date,
      // Set the date to null when it's empty
      if (type === 'date' && value === '') {
        inputValue = null;
      }

      if (type === 'password' && !value) {
        dispatch({
          type: 'REMOVE_PASSWORD_FIELD',
          keys: name.split('.'),
        });

        return;
      }

      // Allow to reset enum
      if (type === 'select-one' && value === '') {
        inputValue = null;
      }

      // Allow to reset number input
      if (type === 'number' && value === '') {
        inputValue = null;
      }

      dispatch({
        type: 'ON_CHANGE',
        keys: name.split('.'),
        value: inputValue,
        shouldSetInitialValue,
      });
    },
    []
  );

  const handleSubmit = async e => {
    e.preventDefault();

    // Create yup schema
    const schema = createYupSchema(
      currentContentTypeLayout,
      {
        components: get(allLayoutData, 'components', {}),
      },
      isCreatingEntry
    );

    try {
      // Validate the form using yup
      await schema.validate(modifiedData, { abortEarly: false });

      // Show a loading button in the EditView/Header.js
      setIsSubmitting(true);

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
      let endPoint;

      // All endpoints for creation and edition are the same for both content types
      // But, the id from the URL didn't exist for the single types.
      // So, we use the id of the modified data if this one is setted.
      if (isCreatingEntry) {
        endPoint = slug;
      } else if (modifiedData) {
        endPoint = `${slug}/${modifiedData.id}`;
      } else {
        endPoint = `${slug}/${id}`;
      }

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

        setIsSubmitting(false);

        dispatch({
          type: 'SUBMIT_SUCCESS',
        });
        strapi.notification.success(`${pluginId}.success.record.save`);

        if (isSingleType) {
          setIsCreatingEntry(false);
        } else {
          redirectToPreviousPage();
        }
      } catch (err) {
        console.error({ err });
        setIsSubmitting(false);

        const error = get(
          err,
          ['response', 'payload', 'message', '0', 'messages', '0', 'id'],
          'SERVER ERROR'
        );

        // Handle validations errors from the API
        if (error === 'ValidationError') {
          const errors = get(err, ['response', 'payload', 'data', '0', 'errors'], {});
          const formattedErrors = Object.keys(errors).reduce((acc, current) => {
            acc[current] = { id: errors[current][0] };

            return acc;
          }, {});

          dispatch({
            type: 'SUBMIT_ERRORS',
            errors: formattedErrors,
          });
        } else {
          emitEvent(isCreatingEntry ? 'didNotCreateEntry' : 'didNotEditEntry', {
            error: err,
          });
        }

        strapi.notification.error(error);
      }
    } catch (err) {
      console.error({ err });
      const errors = getYupInnerErrors(err);
      setIsSubmitting(false);

      dispatch({
        type: 'SUBMIT_ERRORS',
        errors,
      });
    }
  };

  const shouldCheckDZErrors = useCallback(
    dzName => {
      const doesDZHaveError = Object.keys(formErrors).some(key => key.split('.')[0] === dzName);
      const shouldCheckErrors = !isEmpty(formErrors) && doesDZHaveError;

      return shouldCheckErrors;
    },
    [formErrors]
  );

  const moveComponentDown = useCallback(
    (dynamicZoneName, currentIndex) => {
      emitEvent('changeComponentsOrder');
      dispatch({
        type: 'MOVE_COMPONENT_DOWN',
        dynamicZoneName,
        currentIndex,
        shouldCheckErrors: shouldCheckDZErrors(dynamicZoneName),
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shouldCheckDZErrors]
  );

  const moveComponentUp = useCallback(
    (dynamicZoneName, currentIndex) => {
      emitEvent('changeComponentsOrder');
      dispatch({
        type: 'MOVE_COMPONENT_UP',
        dynamicZoneName,
        currentIndex,
        shouldCheckErrors: shouldCheckDZErrors(dynamicZoneName),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shouldCheckDZErrors]
  );

  const moveComponentField = useCallback((pathToComponent, dragIndex, hoverIndex) => {
    dispatch({
      type: 'MOVE_COMPONENT_FIELD',
      pathToComponent,
      dragIndex,
      hoverIndex,
    });
  }, []);

  const moveRelation = useCallback((dragIndex, overIndex, name) => {
    dispatch({
      type: 'MOVE_FIELD',
      dragIndex,
      overIndex,
      keys: name.split('.'),
    });
  }, []);

  const onRemoveRelation = useCallback(keys => {
    dispatch({
      type: 'REMOVE_RELATION',
      keys,
    });
  }, []);

  const removeComponentFromDynamicZone = useCallback((dynamicZoneName, index) => {
    emitEvent('removeComponentFromDynamicZone');

    dispatch({
      type: 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE',
      dynamicZoneName,
      index,
      shouldCheckErrors: shouldCheckDZErrors(dynamicZoneName),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const removeComponentFromField = useCallback((keys, componentUid) => {
    dispatch({
      type: 'REMOVE_COMPONENT_FROM_FIELD',
      keys: keys.split('.'),
      componentUid,
    });
  }, []);

  const removeRepeatableField = useCallback((keys, componentUid) => {
    dispatch({
      type: 'REMOVE_REPEATABLE_FIELD',
      keys: keys.split('.'),
      componentUid,
    });
  }, []);

  const deleteSuccess = () => {
    dispatch({
      type: 'DELETE_SUCCEEDED',
    });
  };

  const resetData = () => {
    dispatch({
      type: 'RESET_DATA',
    });
  };

  const clearData = () => {
    if (isSingleType) {
      setIsCreatingEntry(true);
    }

    dispatch({
      type: 'SET_DEFAULT_MODIFIED_DATA_STRUCTURE',
      contentTypeDataStructure: {},
    });
  };

  const triggerFormValidation = () => {
    dispatch({
      type: 'TRIGGER_FORM_VALIDATION',
    });
  };

  const showLoader = useMemo(() => {
    return !isCreatingEntry && isLoading;
  }, [isCreatingEntry, isLoading]);

  const overlayBlockerParams = useMemo(
    () => ({
      children: <div />,
      noGradient: true,
    }),
    []
  );

  // Redirect the user to the homepage if he is not allowed to create a document
  if (shouldRedirectToHomepageWhenCreatingEntry) {
    return <Redirect to="/" />;
  }

  // Redirect the user to the previous page if he is not allowed to read/update a document
  if (shouldRedirectToHomepageWhenEditingEntry) {
    return <Redirect to={from} />;
  }

  return (
    <EditViewDataManagerContext.Provider
      value={{
        addComponentToDynamicZone,
        addNonRepeatableComponentToField,
        addRelation,
        addRepeatableComponentToField,
        allLayoutData,
        allDynamicZoneFields,
        checkFormErrors,
        clearData,
        createActionAllowedFields,
        deleteSuccess,
        formErrors,
        initialData,
        isCreatingEntry,
        isSingleType,
        isSubmitting,
        layout: currentContentTypeLayout,
        modifiedData,
        moveComponentDown,
        moveComponentField,
        moveComponentUp,
        moveRelation,
        onChange: handleChange,
        onRemoveRelation,
        readActionAllowedFields,
        redirectToPreviousPage,
        removeComponentFromDynamicZone,
        removeComponentFromField,
        removeRepeatableField,
        resetData,
        slug,
        triggerFormValidation,
        updateActionAllowedFields,
      }}
    >
      <>
        <OverlayBlocker key="overlayBlocker" isOpen={isSubmitting} {...overlayBlockerParams} />
        {showLoader ? (
          <LoadingIndicatorPage />
        ) : (
          <>
            <Prompt
              when={!isEqual(modifiedData, initialData)}
              message={formatMessage({ id: 'global.prompt.unsaved' })}
            />
            <form onSubmit={handleSubmit}>{children}</form>
          </>
        )}
      </>
    </EditViewDataManagerContext.Provider>
  );
};

EditViewDataManagerProvider.defaultProps = {
  redirectToPreviousPage: () => {},
};

EditViewDataManagerProvider.propTypes = {
  allLayoutData: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
  isSingleType: PropTypes.bool.isRequired,
  redirectToPreviousPage: PropTypes.func,
  slug: PropTypes.string.isRequired,
};

export default EditViewDataManagerProvider;
