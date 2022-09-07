import React, { useCallback, useEffect, useMemo, useRef, useReducer } from 'react';
import isEmpty from 'lodash/isEmpty';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Prompt, Redirect } from 'react-router-dom';
import { Main } from '@strapi/design-system/Main';
import {
  LoadingIndicatorPage,
  ContentManagerEditViewDataManagerContext,
  useNotification,
  useOverlayBlocker,
  useTracking,
  getYupInnerErrors,
  getAPIInnerErrors,
} from '@strapi/helper-plugin';

import { getTrad, removeKeyInObject } from '../../utils';
import reducer, { initialState } from './reducer';
import { cleanData, createYupSchema } from './utils';

const EditViewDataManagerProvider = ({
  allLayoutData,
  allowedActions: { canRead, canUpdate },
  children,
  componentsDataStructure,
  contentTypeDataStructure,
  createActionAllowedFields,
  from,
  initialValues,
  isCreatingEntry,
  isLoadingForData,
  isSingleType,
  onPost,
  onPublish,
  onPut,
  onUnpublish,
  readActionAllowedFields,
  // Not sure this is needed anymore
  redirectToPreviousPage,
  slug,
  status,
  updateActionAllowedFields,
}) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const { formErrors, initialData, modifiedData, modifiedDZName, shouldCheckErrors } = reducerState;
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();

  const currentContentTypeLayout = get(allLayoutData, ['contentType'], {});

  const hasDraftAndPublish = useMemo(() => {
    return get(currentContentTypeLayout, ['options', 'draftAndPublish'], false);
  }, [currentContentTypeLayout]);

  const shouldNotRunValidations = useMemo(() => {
    return hasDraftAndPublish && !initialData.publishedAt;
  }, [hasDraftAndPublish, initialData.publishedAt]);

  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const trackUsageRef = useRef(trackUsage);

  const shouldRedirectToHomepageWhenEditingEntry = useMemo(() => {
    if (isLoadingForData) {
      return false;
    }

    if (isCreatingEntry) {
      return false;
    }

    if (canRead === false && canUpdate === false) {
      return true;
    }

    return false;
  }, [isLoadingForData, isCreatingEntry, canRead, canUpdate]);

  useEffect(() => {
    if (status === 'resolved') {
      unlockApp();
    } else {
      lockApp();
    }
  }, [lockApp, unlockApp, status]);

  // TODO check this effect if it is really needed (not prio)
  useEffect(() => {
    if (!isLoadingForData) {
      checkFormErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCheckErrors]);

  useEffect(() => {
    const errorsInForm = Object.keys(formErrors);

    // TODO check if working with DZ, components...
    // TODO use querySelector querySelectorAll('[data-strapi-field-error]')
    if (errorsInForm.length > 0) {
      const firstError = errorsInForm[0];
      const el = document.getElementById(firstError);

      if (el) {
        el.focus();
      }
    }
  }, [formErrors]);

  useEffect(() => {
    if (shouldRedirectToHomepageWhenEditingEntry) {
      toggleNotification({
        type: 'info',
        message: { id: getTrad('permissions.not-allowed.update') },
      });
    }
  }, [shouldRedirectToHomepageWhenEditingEntry, toggleNotification]);

  useEffect(() => {
    dispatch({
      type: 'SET_DEFAULT_DATA_STRUCTURES',
      componentsDataStructure,
      contentTypeDataStructure,
    });
  }, [componentsDataStructure, contentTypeDataStructure]);

  useEffect(() => {
    if (initialValues) {
      dispatch({
        type: 'INIT_FORM',
        initialValues,
      });
    }
  }, [initialValues]);

  const addComponentToDynamicZone = useCallback((keys, componentUid, shouldCheckErrors = false) => {
    trackUsageRef.current('didAddComponentToDynamicZone');

    dispatch({
      type: 'ADD_COMPONENT_TO_DYNAMIC_ZONE',
      keys: keys.split('.'),
      componentUid,
      shouldCheckErrors,
    });
  }, []);

  const addNonRepeatableComponentToField = useCallback((keys, componentUid) => {
    dispatch({
      type: 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD',
      keys: keys.split('.'),
      componentUid,
    });
  }, []);

  const connectRelation = useCallback(({ target: { name, value, replace } }) => {
    dispatch({
      type: 'CONNECT_RELATION',
      keys: name.split('.'),
      value,
      replace,
    });
  }, []);

  const loadRelation = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'LOAD_RELATION',
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

  const yupSchema = useMemo(() => {
    const options = { isCreatingEntry, isDraft: shouldNotRunValidations, isFromComponent: false };

    return createYupSchema(
      currentContentTypeLayout,
      {
        components: allLayoutData.components || {},
      },
      options
    );
  }, [
    allLayoutData.components,
    currentContentTypeLayout,
    isCreatingEntry,
    shouldNotRunValidations,
  ]);

  const checkFormErrors = useCallback(
    async (dataToSet = {}) => {
      let errors = {};
      const updatedData = cloneDeep(modifiedData);

      if (!isEmpty(updatedData)) {
        set(updatedData, dataToSet.path, dataToSet.value);
      }

      try {
        // Validate the form using yup
        await yupSchema.validate(updatedData, { abortEarly: false });
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
        type: 'SET_FORM_ERRORS',
        errors,
      });
    },
    [modifiedDZName, modifiedData, yupSchema]
  );

  const handleChange = useCallback(
    ({ target: { name, value, type } }, shouldSetInitialValue = false) => {
      let inputValue = value;

      // Allow to reset text, textarea, email, uid, select/enum, and number
      if (
        ['text', 'textarea', 'string', 'email', 'uid', 'select', 'select-one', 'number'].includes(
          type
        ) &&
        !value &&
        value !== 0
      ) {
        inputValue = null;
      }

      if (type === 'password' && !value) {
        dispatch({
          type: 'REMOVE_PASSWORD_FIELD',
          keys: name.split('.'),
        });

        return;
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

  const createFormData = useCallback(
    (data) => {
      // First we need to remove the added keys needed for the dnd
      const preparedData = removeKeyInObject(cloneDeep(data), '__temp_key__');
      // Then we need to apply our helper
      const cleanedData = cleanData(
        preparedData,
        currentContentTypeLayout,
        allLayoutData.components
      );

      return cleanedData;
    },
    [allLayoutData.components, currentContentTypeLayout]
  );

  const trackerProperty = useMemo(() => {
    if (!hasDraftAndPublish) {
      return {};
    }

    return shouldNotRunValidations ? { status: 'draft' } : {};
  }, [hasDraftAndPublish, shouldNotRunValidations]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      let errors = {};

      try {
        await yupSchema.validate(modifiedData, { abortEarly: false });
      } catch (err) {
        errors = getYupInnerErrors(err);
      }

      try {
        if (isEmpty(errors)) {
          const formData = createFormData(modifiedData);

          if (isCreatingEntry) {
            await onPost(formData, trackerProperty);
          } else {
            await onPut(formData, trackerProperty);
          }
        }
      } catch (err) {
        errors = {
          ...errors,
          ...getAPIInnerErrors(err, { getTrad }),
        };
      }

      dispatch({
        type: 'SET_FORM_ERRORS',
        errors,
      });
    },
    [createFormData, isCreatingEntry, modifiedData, onPost, onPut, trackerProperty, yupSchema]
  );

  const handlePublish = useCallback(async () => {
    // Create yup schema here's we need to apply all the validations
    const schema = createYupSchema(
      currentContentTypeLayout,
      {
        components: get(allLayoutData, 'components', {}),
      },
      { isCreatingEntry, isDraft: false, isFromComponent: false }
    );
    let errors = {};

    try {
      await schema.validate(modifiedData, { abortEarly: false });
    } catch (err) {
      errors = getYupInnerErrors(err);
    }

    try {
      if (isEmpty(errors)) {
        await onPublish();
      }
    } catch (err) {
      errors = {
        ...errors,
        ...getAPIInnerErrors(err, { getTrad }),
      };
    }

    dispatch({
      type: 'SET_FORM_ERRORS',
      errors,
    });
  }, [allLayoutData, currentContentTypeLayout, isCreatingEntry, modifiedData, onPublish]);

  const shouldCheckDZErrors = useCallback(
    (dzName) => {
      const doesDZHaveError = Object.keys(formErrors).some((key) => key.split('.')[0] === dzName);
      const shouldCheckErrors = !isEmpty(formErrors) && doesDZHaveError;

      return shouldCheckErrors;
    },
    [formErrors]
  );

  const moveComponentDown = useCallback(
    (dynamicZoneName, currentIndex) => {
      trackUsageRef.current('changeComponentsOrder');

      dispatch({
        type: 'MOVE_COMPONENT_DOWN',
        dynamicZoneName,
        currentIndex,
        shouldCheckErrors: shouldCheckDZErrors(dynamicZoneName),
      });
    },
    [shouldCheckDZErrors]
  );

  const moveComponentUp = useCallback(
    (dynamicZoneName, currentIndex) => {
      trackUsageRef.current('changeComponentsOrder');

      dispatch({
        type: 'MOVE_COMPONENT_UP',
        dynamicZoneName,
        currentIndex,
        shouldCheckErrors: shouldCheckDZErrors(dynamicZoneName),
      });
    },
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

  const disconnectRelation = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'DISCONNECT_RELATION',
      keys: name.split('.'),
      value,
    });
  }, []);

  const removeComponentFromDynamicZone = useCallback(
    (dynamicZoneName, index) => {
      trackUsageRef.current('removeComponentFromDynamicZone');

      dispatch({
        type: 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE',
        dynamicZoneName,
        index,
        shouldCheckErrors: shouldCheckDZErrors(dynamicZoneName),
      });
    },
    [shouldCheckDZErrors]
  );

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

  const triggerFormValidation = useCallback(() => {
    dispatch({
      type: 'TRIGGER_FORM_VALIDATION',
    });
  }, []);

  // Redirect the user to the previous page if he is not allowed to read/update a document
  if (shouldRedirectToHomepageWhenEditingEntry) {
    return <Redirect to={from} />;
  }

  if (!modifiedData) {
    return null;
  }

  return (
    <ContentManagerEditViewDataManagerContext.Provider
      value={{
        addComponentToDynamicZone,
        addNonRepeatableComponentToField,
        connectRelation,
        addRepeatableComponentToField,
        allLayoutData,
        checkFormErrors,
        createActionAllowedFields,
        formErrors,
        hasDraftAndPublish,
        initialData,
        isCreatingEntry,
        isSingleType,
        shouldNotRunValidations,
        status,
        layout: currentContentTypeLayout,
        loadRelation,
        modifiedData,
        moveComponentDown,
        moveComponentField,
        moveComponentUp,
        onChange: handleChange,
        onPublish: handlePublish,
        onUnpublish,
        disconnectRelation,
        readActionAllowedFields,
        redirectToPreviousPage,
        removeComponentFromDynamicZone,
        removeComponentFromField,
        removeRepeatableField,
        slug,
        triggerFormValidation,
        updateActionAllowedFields,
      }}
    >
      <>
        {isLoadingForData || (!isCreatingEntry && !initialData.id) ? (
          <Main aria-busy="true">
            <LoadingIndicatorPage />
          </Main>
        ) : (
          <>
            <Prompt
              when={!isEqual(modifiedData, initialData)}
              message={formatMessage({ id: 'global.prompt.unsaved' })}
            />
            <form noValidate onSubmit={handleSubmit}>
              {children}
            </form>
          </>
        )}
      </>
    </ContentManagerEditViewDataManagerContext.Provider>
  );
};

EditViewDataManagerProvider.defaultProps = {
  from: '/',
  initialValues: null,
  redirectToPreviousPage() {},
};

EditViewDataManagerProvider.propTypes = {
  allLayoutData: PropTypes.object.isRequired,
  allowedActions: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
  componentsDataStructure: PropTypes.object.isRequired,
  contentTypeDataStructure: PropTypes.object.isRequired,
  createActionAllowedFields: PropTypes.array.isRequired,
  from: PropTypes.string,
  initialValues: PropTypes.object,
  isCreatingEntry: PropTypes.bool.isRequired,
  isLoadingForData: PropTypes.bool.isRequired,
  isSingleType: PropTypes.bool.isRequired,
  onPost: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired,
  onPut: PropTypes.func.isRequired,
  onUnpublish: PropTypes.func.isRequired,
  readActionAllowedFields: PropTypes.array.isRequired,
  redirectToPreviousPage: PropTypes.func,
  slug: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  updateActionAllowedFields: PropTypes.array.isRequired,
};

export default EditViewDataManagerProvider;
