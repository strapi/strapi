/* eslint-disable react/jsx-no-constructed-context-values */
import React, { useCallback, useEffect, useMemo, useRef, useReducer } from 'react';
import isEmpty from 'lodash/isEmpty';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Prompt, Redirect, useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Main } from '@strapi/design-system';
import {
  LoadingIndicatorPage,
  ContentManagerEditViewDataManagerContext,
  useNotification,
  useOverlayBlocker,
  useTracking,
  formatContentTypeData,
  getYupInnerErrors,
  getAPIInnerErrors,
  useGuidedTour,
  useQueryParams,
} from '@strapi/helper-plugin';

import { usePrev } from '../../hooks';
import { getTrad, getRequestUrl, createDefaultForm } from '../../utils';
import { useEntity } from '../../hooks/useEntity';
import selectCrudReducer from '../../sharedReducers/crudReducer/selectors';

import reducer, { initialState } from './reducer';
import { cleanData, createYupSchema } from './utils';
import {
  clearSetModifiedDataOnly,
  setDataStructures,
  resetProps,
} from '../../sharedReducers/crudReducer/actions';

const EditViewDataManagerProvider = ({
  allLayoutData,
  allowedActions: { canRead, canUpdate },
  children,
  componentsDataStructure,
  contentTypeDataStructure,
  createActionAllowedFields,
  from,
  isSingleType,
  readActionAllowedFields,
  // Not sure this is needed anymore
  redirectToPreviousPage,
  slug,
  status,
  updateActionAllowedFields,
  // todo: what is a better way to pass this down?
  // eslint-disable-next-line
  id,
}) => {
  const [{ rawQuery }] = useQueryParams();
  const { replace } = useHistory();
  const { setCurrentStep } = useGuidedTour();
  const { create, update, publish, unpublish, entity, isLoading, isCreating } = useEntity(
    allLayoutData,
    id
  );

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

  const { setModifiedDataOnly } = useSelector(selectCrudReducer);
  const reduxDispatch = useDispatch();

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

  const { components, contentType } = allLayoutData;

  const shouldRedirectToHomepageWhenEditingEntry = useMemo(() => {
    if (isLoading) {
      return false;
    }

    if (isCreating) {
      return false;
    }

    if (canRead === false && canUpdate === false) {
      return true;
    }

    return false;
  }, [isLoading, isCreating, canRead, canUpdate]);

  useEffect(() => {
    if (status === 'resolved') {
      unlockApp();
    } else {
      lockApp();
    }
  }, [lockApp, unlockApp, status]);

  useEffect(() => {
    dispatch(resetProps());
  }, [dispatch]);

  // TODO check this effect if it is really needed (not prio)
  useEffect(() => {
    if (!isLoading) {
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
    if (isLoading) {
      return;
    }

    const componentsDataStructure = Object.keys(components).reduce((acc, current) => {
      const defaultComponentForm = createDefaultForm(
        components?.[current]?.attributes ?? {},
        components
      );

      acc[current] = formatContentTypeData(defaultComponentForm, components[current], components);

      return acc;
    }, {});

    const contentTypeDataStructure = createDefaultForm(contentType.attributes ?? {}, components);
    const contentTypeDataStructureFormatted = formatContentTypeData(
      contentTypeDataStructure,
      contentType,
      components
    );

    dispatch(setDataStructures(componentsDataStructure, contentTypeDataStructureFormatted));
  }, [dispatch, entity, components, contentType, isLoading]);

  const previousInitialValues = usePrev(entity);

  useEffect(() => {
    /**
     * Only fire this effect if the initialValues are different
     * otherwise it's a fruitless effort no matter what happens.
     */
    if (entity && currentContentTypeLayout?.attributes && !isEqual(previousInitialValues, entity)) {
      dispatch({
        type: 'INIT_FORM',
        initialValues: entity,
        components,
        attributes: currentContentTypeLayout.attributes,
        setModifiedDataOnly,
      });

      /**
       * TODO: This should be moved to a side-effect e.g. thunks
       * something to consider for V5
       */
      if (setModifiedDataOnly) {
        reduxDispatch(clearSetModifiedDataOnly());
      }
    }
  }, [
    entity,
    currentContentTypeLayout,
    components,
    setModifiedDataOnly,
    reduxDispatch,
    previousInitialValues,
  ]);

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
  const relationConnect = useCallback(({ name, value, toOneRelation }) => {
    dispatch({
      type: 'CONNECT_RELATION',
      keys: name.split('.'),
      value,
      toOneRelation,
    });
  }, []);

  const relationLoad = useCallback(({ target: { initialDataPath, modifiedDataPath, value } }) => {
    dispatch({
      type: 'LOAD_RELATION',
      modifiedDataPath,
      initialDataPath,
      value,
    });
  }, []);

  const addRepeatableComponentToField = dispatchAddComponent('ADD_REPEATABLE_COMPONENT_TO_FIELD');

  const yupSchema = useMemo(() => {
    const options = {
      isCreatingEntry: isCreating,
      isDraft: shouldNotRunValidations,
      isFromComponent: false,
    };

    return createYupSchema(
      currentContentTypeLayout,
      {
        components: allLayoutData.components || {},
      },
      options
    );
  }, [allLayoutData.components, currentContentTypeLayout, isCreating, shouldNotRunValidations]);

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
      // Then we need to apply our helper
      const cleanedData = cleanData(
        { browserState: modifiedData, serverState: initialData },
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

          if (isCreating) {
            const { id } = await create(formData, trackerProperty);
            const redirectLink =
              contentType.kind === 'singleType'
                ? `${contentType.kind}/${slug}${rawQuery}`
                : `${contentType.kind}/${slug}/${id}${rawQuery}`;

            // Move the guided tour forward
            setCurrentStep('contentManager.success');

            // Update URL for the new entity
            replace(getRequestUrl(redirectLink));
          } else {
            await update(formData, trackerProperty);
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
      yupSchema,
      modifiedData,
      createFormData,
      initialData,
      isCreating,
      create,
      trackerProperty,
      contentType.kind,
      slug,
      rawQuery,
      setCurrentStep,
      replace,
      update,
    ]
  );

  const handlePublish = useCallback(async () => {
    // Create yup schema here's we need to apply all the validations
    const schema = createYupSchema(
      currentContentTypeLayout,
      {
        components: get(allLayoutData, 'components', {}),
      },
      { isCreatingEntry: isCreating, isDraft: false, isFromComponent: false }
    );

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
        await publish();
      }
    } catch (err) {
      // TODO: find out what the best way to catch the error would be
      if (!publishConfirmation.show && err) {
        // If the warning hasn't already been shown and draft relations are found,
        // abort the publish call and ask for confirmation from the user
        dispatch({
          type: 'SET_PUBLISH_CONFIRMATION',
          publishConfirmation: {
            show: true,
            // maybe?
            draftCount: err.details,
          },
        });

        return;
      }

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
    isCreating,
    modifiedData,
    publishConfirmation.show,
    publish,
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

  const moveComponentField = useCallback(({ name, newIndex, currentIndex }) => {
    dispatch({
      type: 'MOVE_COMPONENT_FIELD',
      keys: name.split('.'),
      newIndex,
      oldIndex: currentIndex,
    });
  }, []);

  const relationDisconnect = useCallback(({ name, id }) => {
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
  const relationReorder = useCallback(({ name, oldIndex, newIndex }) => {
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
        addRepeatableComponentToField,
        allLayoutData,
        checkFormErrors,
        createActionAllowedFields,
        formErrors,
        hasDraftAndPublish,
        initialData,
        isCreatingEntry: isCreating,
        isSingleType,
        shouldNotRunValidations,
        status,
        layout: currentContentTypeLayout,
        modifiedData,
        moveComponentField,
        /**
         * @deprecated use `moveComponentField` instead. This will be removed in v5.
         */
        moveComponentDown,
        /**
         * @deprecated use `moveComponentField` instead. This will be removed in v5.
         */
        moveComponentUp,
        onChange: handleChange,
        onPublish: handlePublish,
        // todo
        onUnpublish: unpublish,
        readActionAllowedFields,
        redirectToPreviousPage,
        removeComponentFromDynamicZone,
        removeComponentFromField,
        removeRepeatableField,
        relationConnect,
        relationDisconnect,
        relationLoad,
        relationReorder,
        slug,
        triggerFormValidation,
        updateActionAllowedFields,
        onPublishPromptDismissal: handlePublishPromptDismissal,
        publishConfirmation,
      }}
    >
      {isLoading || (!isCreating && !initialData.id) ? (
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
  isSingleType: PropTypes.bool.isRequired,
  readActionAllowedFields: PropTypes.array.isRequired,
  redirectToPreviousPage: PropTypes.func,
  slug: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  updateActionAllowedFields: PropTypes.array.isRequired,
};

export default EditViewDataManagerProvider;
