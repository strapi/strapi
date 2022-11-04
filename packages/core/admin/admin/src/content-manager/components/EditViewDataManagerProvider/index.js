/* eslint-disable react/jsx-no-constructed-context-values */
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
import { cleanData, createYupSchema, recursivelyFindPathsBasedOnCondition } from './utils';

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
  onDraftRelationCheck,
  onPut,
  onUnpublish,
  readActionAllowedFields,
  // Not sure this is needed anymore
  redirectToPreviousPage,
  slug,
  status,
  updateActionAllowedFields,
}) => {
  /**
   * TODO: this should be moved into the global reducer
   * to match ever other reducer in the CM.
   */
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const {
    formErrors,
    initialData,
    modifiedData,
    modifiedDZName,
    shouldCheckErrors,
    publishConfirmation,
  } = reducerState;

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

  const { components } = allLayoutData;

  useEffect(() => {
    if (initialValues && currentContentTypeLayout?.attributes) {
      /**
       * This will return an array of paths:
       * ['many_to_one', 'one_to_many', 'one_to_one']
       * it can also return a path to a relation:
       * ['relation_component.categories']
       */
      const relationalFieldPaths = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'relation'
      )(currentContentTypeLayout.attributes);

      const componentPaths = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'component' && !value.repeatable
      )(currentContentTypeLayout.attributes);

      const repeatableComponentPaths = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'component' && value.repeatable
      )(currentContentTypeLayout.attributes);

      const dynamicZonePaths = recursivelyFindPathsBasedOnCondition(
        components,
        (value) => value.type === 'dynamiczone'
      )(currentContentTypeLayout.attributes);

      dispatch({
        type: 'INIT_FORM',
        initialValues,
        relationalFieldPaths,
        componentPaths,
        repeatableComponentPaths,
        dynamicZonePaths,
      });
    }
  }, [initialValues, currentContentTypeLayout, components]);

  const dispatchAddComponent = useCallback(
    (type) =>
      (keys, componentLayoutData, components, shouldCheckErrors = false) => {
        trackUsageRef.current('didAddComponentToDynamicZone');

        dispatch({
          type,
          keys: keys.split('.'),
          componentLayoutData,
          allComponents: components,
          shouldCheckErrors,
        });
      },
    []
  );

  const addComponentToDynamicZone = dispatchAddComponent('ADD_COMPONENT_TO_DYNAMIC_ZONE');

  const addNonRepeatableComponentToField = useCallback(
    (keys, componentLayoutData, allComponents) => {
      dispatch({
        type: 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD',
        keys: keys.split('.'),
        componentLayoutData,
        allComponents,
      });
    },
    []
  );

  /**
   * @type {({ name: string, value: Relation, toOneRelation: boolean}) => void}
   */
  const connectRelation = useCallback(({ name, value, toOneRelation }) => {
    dispatch({
      type: 'CONNECT_RELATION',
      keys: name.split('.'),
      value,
      toOneRelation,
    });
  }, []);

  const loadRelation = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'LOAD_RELATION',
      keys: name.split('.'),
      value,
    });
  }, []);

  const addRepeatableComponentToField = dispatchAddComponent('ADD_REPEATABLE_COMPONENT_TO_FIELD');

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
    (modifiedData, initialData) => {
      // First we need to remove the added keys needed for the dnd
      const preparedData = removeKeyInObject(cloneDeep(modifiedData), '__temp_key__');
      // Then we need to apply our helper
      const cleanedData = cleanData(
        { browserState: preparedData, serverState: initialData },
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

  const handlePublishPromptDismissal = useCallback(async (e) => {
    e.preventDefault();

    return dispatch({
      type: 'RESET_PUBLISH_CONFIRMATION',
    });
  }, []);

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
          const formData = createFormData(modifiedData, initialData);

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
    [
      createFormData,
      isCreatingEntry,
      modifiedData,
      initialData,
      onPost,
      onPut,
      trackerProperty,
      yupSchema,
    ]
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

    const draftCount = await onDraftRelationCheck();

    if (!publishConfirmation.show && draftCount > 0) {
      // If the warning hasn't already been shown and draft relations are found,
      // abort the publish call and ask for confirmation from the user
      dispatch({
        type: 'SET_PUBLISH_CONFIRMATION',
        publishConfirmation: {
          show: true,
          draftCount,
        },
      });

      return;
    }
    dispatch({
      type: 'RESET_PUBLISH_CONFIRMATION',
    });

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
  }, [
    allLayoutData,
    currentContentTypeLayout,
    isCreatingEntry,
    modifiedData,
    publishConfirmation.show,
    onPublish,
    onDraftRelationCheck,
  ]);

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

  const disconnectRelation = useCallback(({ name, id }) => {
    dispatch({
      type: 'DISCONNECT_RELATION',
      keys: name.split('.'),
      id,
    });
  }, []);

  /**
   * @typedef Payload
   * @type {object}
   * @property {string} name - The name of the field in `modifiedData`
   * @property {number} oldIndex - The relation's current index
   * @property {number} newIndex - The relation's new index
   *
   *
   * @type {(payload: Payload) => void}
   */
  const reorderRelation = useCallback(({ name, oldIndex, newIndex }) => {
    dispatch({
      type: 'REORDER_RELATION',
      keys: name.split('.'),
      oldIndex,
      newIndex,
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
        reorderRelation,
        slug,
        triggerFormValidation,
        updateActionAllowedFields,
        onPublishPromptDismissal: handlePublishPromptDismissal,
        publishConfirmation,
      }}
    >
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
  onDraftRelationCheck: PropTypes.func.isRequired,
  onPut: PropTypes.func.isRequired,
  onUnpublish: PropTypes.func.isRequired,
  readActionAllowedFields: PropTypes.array.isRequired,
  redirectToPreviousPage: PropTypes.func,
  slug: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  updateActionAllowedFields: PropTypes.array.isRequired,
};

export default EditViewDataManagerProvider;
