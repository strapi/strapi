import * as React from 'react';

import { Main } from '@strapi/design-system';
import {
  AllowedActions,
  ContentManagerEditViewDataManagerContext,
  getAPIInnerErrors,
  getYupInnerErrors,
  LoadingIndicatorPage,
  TranslationMessage,
  useNotification,
  useOverlayBlocker,
  useTracking,
} from '@strapi/helper-plugin';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';
import { flushSync } from 'react-dom';
import { useIntl } from 'react-intl';
import { Prompt, Redirect } from 'react-router-dom';
import { ValidationError } from 'yup';

import { useTypedDispatch, useTypedSelector } from '../../../core/store/hooks';
import { usePrev } from '../../hooks/usePrev';
import { clearSetModifiedDataOnly } from '../../sharedReducers/crud/actions';
import { getTranslation } from '../../utils/translations';
import { createYupSchema } from '../../utils/validation';
import { RenderChildProps } from '../ContentTypeFormWrapper';

import { reducer, initialState, RelationData } from './reducer';
import { cleanData } from './utils/cleanData';

import type { EntityData } from '../../sharedReducers/crud/reducer';
import type { FormattedComponentLayout } from '../../utils/layouts';
import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Attribute, Entity } from '@strapi/types';

interface EditViewDataManagerProviderProps
  extends Pick<
    RenderChildProps,
    | 'componentsDataStructure'
    | 'contentTypeDataStructure'
    | 'isCreatingEntry'
    | 'isLoadingForData'
    | 'onDraftRelationCheck'
    | 'onPost'
    | 'onPublish'
    | 'onPut'
    | 'onUnpublish'
    | 'status'
  > {
  allowedActions: AllowedActions;
  createActionAllowedFields: string[];
  children: React.ReactNode;
  from: RenderChildProps['redirectionLink'];
  initialValues: EntityData | null;
  isSingleType: boolean;
  readActionAllowedFields: string[];
  redirectToPreviousPage: () => void;
  slug: string;
  updateActionAllowedFields: string[];
}

const EditViewDataManagerProvider = ({
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
}: EditViewDataManagerProviderProps) => {
  const allLayoutData = useTypedSelector(
    (state) => state['content-manager_editViewLayoutManager'].currentLayout
  );
  const [isSaving, setIsSaving] = React.useState(false);
  /**
   * TODO: this should be moved into the global reducer
   * to match ever other reducer in the CM.
   */
  const [reducerState, dispatch] = React.useReducer(reducer, initialState);
  const {
    formErrors,
    initialData,
    modifiedData,
    modifiedDZName,
    shouldCheckErrors,
    publishConfirmation,
  } = reducerState;

  const { setModifiedDataOnly } = useTypedSelector(
    (state) => state['content-manager_editViewCrudReducer']
  );
  const reduxDispatch = useTypedDispatch();

  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();

  const currentContentTypeLayout = allLayoutData.contentType;

  const hasDraftAndPublish = React.useMemo(() => {
    return get(currentContentTypeLayout, ['options', 'draftAndPublish'], false);
  }, [currentContentTypeLayout]);

  const shouldNotRunValidations = React.useMemo(() => {
    return hasDraftAndPublish && !initialData.publishedAt;
  }, [hasDraftAndPublish, initialData.publishedAt]);

  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();

  const shouldRedirectToHomepageWhenEditingEntry = React.useMemo(() => {
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

  React.useEffect(() => {
    if (status === 'resolved') {
      // @ts-expect-error – fixed by context assertion in V5
      unlockApp();
    } else {
      // @ts-expect-error – fixed by context assertion in V5
      lockApp();
    }
  }, [lockApp, unlockApp, status]);

  // TODO: check this effect if it is really needed (not prio)
  React.useEffect(() => {
    if (!isLoadingForData) {
      checkFormErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCheckErrors]);

  React.useEffect(() => {
    const errorsInForm = Object.keys(formErrors);

    // TODO: check if working with DZ, components...
    // TODO: use querySelector querySelectorAll('[data-strapi-field-error]')
    if (errorsInForm.length > 0) {
      const firstError = errorsInForm[0];
      const el = document.getElementById(firstError);

      if (el) {
        el.focus();
      }
    }
  }, [formErrors]);

  React.useEffect(() => {
    if (shouldRedirectToHomepageWhenEditingEntry) {
      toggleNotification({
        type: 'info',
        message: { id: getTranslation('permissions.not-allowed.update') },
      });
    }
  }, [shouldRedirectToHomepageWhenEditingEntry, toggleNotification]);

  React.useEffect(() => {
    dispatch({
      type: 'SET_DEFAULT_DATA_STRUCTURES',
      componentsDataStructure,
      contentTypeDataStructure,
    });
  }, [componentsDataStructure, contentTypeDataStructure]);

  const { components } = allLayoutData;

  const previousInitialValues = usePrev(initialValues);

  React.useEffect(() => {
    /**
     * Only fire this effect if the initialValues are different
     * otherwise it's a fruitless effort no matter what happens.
     */
    if (
      initialValues &&
      currentContentTypeLayout?.attributes &&
      !isEqual(previousInitialValues, initialValues)
    ) {
      dispatch({
        type: 'INIT_FORM',
        initialValues,
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
    initialValues,
    currentContentTypeLayout,
    components,
    setModifiedDataOnly,
    reduxDispatch,
    previousInitialValues,
  ]);

  const dispatchAddComponent = React.useCallback(
    (type: 'ADD_COMPONENT_TO_DYNAMIC_ZONE' | 'ADD_REPEATABLE_COMPONENT_TO_FIELD') =>
      (
        keys: string,
        componentLayoutData: FormattedComponentLayout,
        allComponents: Record<string, FormattedComponentLayout>,
        shouldCheckErrors = false,
        position = undefined
      ) => {
        trackUsage('didAddComponentToDynamicZone');

        dispatch({
          type,
          keys: keys.split('.'),
          position,
          componentLayoutData,
          allComponents,
          shouldCheckErrors,
        });
      },
    [trackUsage]
  );

  const addComponentToDynamicZone = dispatchAddComponent('ADD_COMPONENT_TO_DYNAMIC_ZONE');

  const addNonRepeatableComponentToField = React.useCallback(
    (
      keys: string,
      componentLayoutData: FormattedComponentLayout,
      allComponents: Record<string, FormattedComponentLayout>
    ) => {
      dispatch({
        type: 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD',
        keys: keys.split('.'),
        componentLayoutData,
        allComponents,
      });
    },
    []
  );

  const relationConnect = React.useCallback(
    ({
      name,
      value,
      toOneRelation,
    }: {
      name: string;
      value: Omit<RelationData, '__temp_key__'>;
      toOneRelation?: boolean;
    }) => {
      dispatch({
        type: 'CONNECT_RELATION',
        keys: name.split('.'),
        value,
        toOneRelation,
      });
    },
    []
  );

  const relationLoad = React.useCallback(
    ({
      target: { initialDataPath, modifiedDataPath, value },
    }: {
      target: {
        initialDataPath: string[];
        modifiedDataPath: string[];
        value: Omit<RelationData, '__temp_key__'>[];
      };
    }) => {
      dispatch({
        type: 'LOAD_RELATION',
        modifiedDataPath,
        initialDataPath,
        value,
      });
    },
    []
  );

  const addRepeatableComponentToField = dispatchAddComponent('ADD_REPEATABLE_COMPONENT_TO_FIELD');

  const yupSchema = React.useMemo(() => {
    const options = { isCreatingEntry, isDraft: shouldNotRunValidations, isFromComponent: false };

    return createYupSchema(
      currentContentTypeLayout!,
      {
        components: allLayoutData.components,
      },
      options
    );
  }, [
    allLayoutData.components,
    currentContentTypeLayout,
    isCreatingEntry,
    shouldNotRunValidations,
  ]);

  const checkFormErrors = React.useCallback(
    async (
      dataToSet: {
        path?: string;
        value?: any;
      } = {}
    ) => {
      let errors: Record<string, TranslationMessage> = {};
      const updatedData = cloneDeep(modifiedData);

      if (!isEmpty(updatedData) && dataToSet.path) {
        set(updatedData, dataToSet.path, dataToSet.value);
      }

      try {
        // Validate the form using yup
        await yupSchema.validate(updatedData, { abortEarly: false });
      } catch (err) {
        if (err instanceof ValidationError) {
          errors = getYupInnerErrors(err);
        }

        if (modifiedDZName) {
          errors = Object.keys(errors).reduce<Record<string, TranslationMessage>>(
            (acc, current) => {
              const dzName = current.split('.')[0];

              if (dzName !== modifiedDZName) {
                acc[current] = errors[current];
              }

              return acc;
            },
            {}
          );
        }
      }

      dispatch({
        type: 'SET_FORM_ERRORS',
        errors,
      });
    },
    [modifiedDZName, modifiedData, yupSchema]
  );

  const handleChange = React.useCallback(
    (
      {
        target,
      }: { target: { name: string; type: string; value: Attribute.GetValue<Attribute.Any> } },
      shouldSetInitialValue = false
    ) => {
      const { name, value, type } = target;
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

  const createFormData = React.useCallback(
    (modifiedData: Record<string, any>, initialData: Record<string, any>) => {
      // Then we need to apply our helper
      const cleanedData = cleanData(
        { browserState: modifiedData, serverState: initialData },
        currentContentTypeLayout!,
        allLayoutData.components
      );

      // TODO: can we remove the cast?
      return cleanedData as Contracts.SingleTypes.CreateOrUpdate.Request['body'];
    },
    [allLayoutData.components, currentContentTypeLayout]
  );

  const trackerProperty = React.useMemo(() => {
    if (!hasDraftAndPublish) {
      return {};
    }

    return shouldNotRunValidations ? { status: 'draft' } : {};
  }, [hasDraftAndPublish, shouldNotRunValidations]);

  const handlePublishPromptDismissal = React.useCallback(async (e: React.SyntheticEvent) => {
    e.preventDefault();

    return dispatch({
      type: 'RESET_PUBLISH_CONFIRMATION',
    });
  }, []);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      let errors: Record<string, TranslationMessage> = {};

      try {
        await yupSchema.validate(modifiedData, { abortEarly: false });
      } catch (err) {
        if (err instanceof ValidationError) {
          errors = getYupInnerErrors(err);
        } else {
          console.error(err);
        }
      }

      try {
        if (isEmpty(errors)) {
          const formData = createFormData(modifiedData, initialData);
          flushSync(() => {
            setIsSaving(true);
          });

          if (isCreatingEntry) {
            await onPost(formData, trackerProperty);
          } else {
            await onPut(formData, trackerProperty);
          }

          setIsSaving(false);
        }
      } catch (err) {
        setIsSaving(false);
        errors = {
          ...errors,
          // @ts-expect-error – remove the function later.
          ...getAPIInnerErrors(err, { getTranslation }),
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

  const handlePublish = React.useCallback(async () => {
    // Create yup schema here's we need to apply all the validations
    const schema = createYupSchema(
      currentContentTypeLayout!,
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
      if (err instanceof ValidationError) {
        errors = getYupInnerErrors(err);
      }
    }

    try {
      if (isEmpty(errors)) {
        flushSync(() => {
          setIsSaving(true);
        });
        await onPublish();
        setIsSaving(false);
      }
    } catch (err) {
      setIsSaving(false);
      errors = {
        ...errors,
        // @ts-expect-error – we'll remove this deprecated function later anyway.
        ...getAPIInnerErrors(err, { getTranslation }),
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

  const shouldCheckDZErrors = React.useCallback(
    (dzName: string) => {
      const doesDZHaveError = Object.keys(formErrors).some((key) => key.split('.')[0] === dzName);
      const shouldCheckErrors = !isEmpty(formErrors) && doesDZHaveError;

      return shouldCheckErrors;
    },
    [formErrors]
  );

  const moveComponentDown = React.useCallback(
    (dynamicZoneName: string, currentIndex: number) => {
      trackUsage('changeComponentsOrder');

      dispatch({
        type: 'MOVE_COMPONENT_DOWN',
        dynamicZoneName,
        currentIndex,
        shouldCheckErrors: shouldCheckDZErrors(dynamicZoneName),
      });
    },
    [shouldCheckDZErrors, trackUsage]
  );

  const moveComponentUp = React.useCallback(
    (dynamicZoneName: string, currentIndex: number) => {
      trackUsage('changeComponentsOrder');

      dispatch({
        type: 'MOVE_COMPONENT_UP',
        dynamicZoneName,
        currentIndex,
        shouldCheckErrors: shouldCheckDZErrors(dynamicZoneName),
      });
    },
    [shouldCheckDZErrors, trackUsage]
  );

  const moveComponentField = React.useCallback(
    ({
      name,
      newIndex,
      currentIndex,
    }: {
      name: string;
      currentIndex: number;
      newIndex: number;
    }) => {
      dispatch({
        type: 'MOVE_COMPONENT_FIELD',
        keys: name.split('.'),
        newIndex,
        oldIndex: currentIndex,
      });
    },
    []
  );

  const relationDisconnect = React.useCallback(({ name, id }: { name: string; id: Entity.ID }) => {
    dispatch({
      type: 'DISCONNECT_RELATION',
      keys: name.split('.'),
      id,
    });
  }, []);

  const relationReorder = React.useCallback(
    ({ name, oldIndex, newIndex }: { name: string; oldIndex: number; newIndex: number }) => {
      dispatch({
        type: 'REORDER_RELATION',
        keys: name.split('.'),
        oldIndex,
        newIndex,
      });
    },
    []
  );

  const removeComponentFromDynamicZone = React.useCallback(
    (dynamicZoneName: string, index: number) => {
      trackUsage('removeComponentFromDynamicZone');

      dispatch({
        type: 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE',
        dynamicZoneName,
        index,
        shouldCheckErrors: shouldCheckDZErrors(dynamicZoneName),
      });
    },
    [shouldCheckDZErrors, trackUsage]
  );

  const removeComponentFromField = React.useCallback((keys: string) => {
    dispatch({
      type: 'REMOVE_COMPONENT_FROM_FIELD',
      keys: keys.split('.'),
    });
  }, []);

  const removeRepeatableField = React.useCallback((keys: string) => {
    dispatch({
      type: 'REMOVE_REPEATABLE_FIELD',
      keys: keys.split('.'),
    });
  }, []);

  const triggerFormValidation = React.useCallback(() => {
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
        // @ts-expect-error – issue with the provider being in the helper-plugin and not having access to the "unique" layout type
        addComponentToDynamicZone,
        // @ts-expect-error – issue with the provider being in the helper-plugin and not having access to the "unique" layout type
        addNonRepeatableComponentToField,
        // @ts-expect-error – issue with the provider being in the helper-plugin and not having access to the "unique" layout type
        addRepeatableComponentToField,
        // @ts-expect-error – issue with the provider being in the helper-plugin and not having access to the "unique" layout type
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
        // @ts-expect-error – issue with the provider being in the helper-plugin and not having access to the "unique" layout type
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
        onUnpublish,
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
      {/* with SingleTypes, we'll never be creating the entry and there won't ever be an id because thats not how single types work. */}
      {isLoadingForData || (!isCreatingEntry && !initialData.id && !isSingleType) ? (
        <Main aria-busy="true">
          <LoadingIndicatorPage />
        </Main>
      ) : (
        <>
          {!isSaving ? (
            <Prompt
              when={!isEqual(modifiedData, initialData)}
              message={formatMessage({ id: 'global.prompt.unsaved' })}
            />
          ) : null}
          <form noValidate onSubmit={handleSubmit}>
            {children}
          </form>
        </>
      )}
    </ContentManagerEditViewDataManagerContext.Provider>
  );
};

export { EditViewDataManagerProvider };
