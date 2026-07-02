import * as React from 'react';
import { useState } from 'react';

import {
  useStrapiApp,
  useNotification,
  ConfirmDialog,
  useGuidedTour,
  GUIDED_TOUR_REQUIRED_ACTIONS,
} from '@strapi/admin/strapi-admin';
import { Button, Divider, Flex, Modal, Tabs, Box, Typography, Dialog } from '@strapi/design-system';
import get from 'lodash/get';
import has from 'lodash/has';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';
import { useIntl } from 'react-intl';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import * as yup from 'yup';

import { pluginId } from '../../pluginId';
import { getTrad, isAllowedContentTypesForRelations } from '../../utils';
import { findAttribute } from '../../utils/findAttribute';
import { getYupInnerErrors } from '../../utils/getYupInnerErrors';
// New compos
import { AllowedTypesSelect } from '../AllowedTypesSelect';
import { IconByType } from '../AttributeIcon';
import { AttributeOptions } from '../AttributeOptions/AttributeOptions';
import { BooleanDefaultValueSelect } from '../BooleanDefaultValueSelect';
import { BooleanRadioGroup } from '../BooleanRadioGroup';
import { CheckboxWithNumberField } from '../CheckboxWithNumberField';
import { ContentTypeRadioGroup } from '../ContentTypeRadioGroup';
import { useCTBTracking } from '../CTBSession/ctbSession';
import { CustomRadioGroup } from '../CustomRadioGroup';
import { useDataManager } from '../DataManager/useDataManager';
import { DraftAndPublishToggle } from '../DraftAndPublishToggle';
import { FormModalEndActions } from '../FormModalEndActions';
import { FormModalHeader } from '../FormModalHeader';
import { useFormModalNavigation } from '../FormModalNavigation/useFormModalNavigation';
import { FormModalSubHeader } from '../FormModalSubHeader';
import { IconPicker } from '../IconPicker/IconPicker';
import { PluralName } from '../PluralName';
import { Relation } from '../Relation/Relation';
import { SelectCategory } from '../SelectCategory';
import { SelectComponent } from '../SelectComponent';
import { SelectComponents } from '../SelectComponents';
import { SelectDateType } from '../SelectDateType';
import { SelectNumber } from '../SelectNumber';
import { SingularName } from '../SingularName';
import { TabForm } from '../TabForm';
import { TextareaEnum } from '../TextareaEnum';

import { ConditionForm } from './attributes/ConditionForm';
import { forms } from './forms/forms';
import {
  actions,
  initialState,
  type ComponentToCreateData,
  type FormModalData,
  type State as FormModalState,
} from './reducer';
import { canEditContentType } from './utils/canEditContentType';
import { createComponentUid, createUid } from './utils/createUid';
import { getAttributesToDisplay } from './utils/getAttributesToDisplay';
import { getFormInputNames } from './utils/getFormInputNames';

import type { AnyAttribute, ContentType } from '../../types';
import type { FormAPI } from '../../utils/formAPI';
import type { Tab } from '../FormModalNavigation/FormModalNavigationProvider';
import type { Internal, Struct } from '@strapi/types';

const FormComponent = styled.form`
  overflow: auto;
`;

const selectState = (state: Record<string, unknown>) =>
  (state['content-type-builder_formModal'] || initialState) as FormModalState;

type PendingSubmit = {
  e: React.SyntheticEvent;
  shouldContinue: boolean;
};

const toStringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

const toOptionalStringValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value === '') {
    return undefined;
  }

  return value;
};

const toBooleanValue = (value: unknown): boolean => (typeof value === 'boolean' ? value : false);

const toContentTypeKind = (value: unknown): Struct.ContentTypeKind =>
  value === 'singleType' ? 'singleType' : 'collectionType';

const toRecordValue = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const toComponentDraft = (value?: ComponentToCreateData) => ({
  category: toStringValue(value?.category),
  displayName: toStringValue(value?.displayName),
  icon: toOptionalStringValue(value?.icon),
});

export const FormModal = () => {
  const {
    onCloseModal,
    onNavigateToChooseAttributeModal,
    onNavigateToAddCompoToDZModal,
    onNavigateToCreateComponentStep2,
    actionType,
    attributeName,
    attributeType,
    customFieldUid,
    dynamicZoneTarget,
    forTarget,
    modalType,
    isOpen,
    kind,
    step,
    targetUid,
    showBackLink,
    activeTab,
    setActiveTab,
  } = useFormModalNavigation();

  const getPlugin = useStrapiApp('FormModal', (state) => state.getPlugin);
  const getCustomField = useStrapiApp('FormModal', (state) => state.customFields.get);
  const customField = getCustomField(customFieldUid);

  const dispatch = useDispatch();
  const { toggleNotification } = useNotification();
  const reducerState = useSelector(selectState, shallowEqual);

  const navigate = useNavigate();
  const { trackUsage } = useCTBTracking();
  const { formatMessage } = useIntl();
  const ctbPlugin = getPlugin(pluginId);
  const ctbFormsAPI = ctbPlugin?.apis.forms as FormAPI;
  const inputsFromPlugins = ctbFormsAPI.components.inputs;

  const dispatchGuidedTour = useGuidedTour('FormModal', (s) => s.dispatch);

  const {
    addAttribute,
    editAttribute,
    addCustomFieldAttribute,
    addCreatedComponentToDynamicZone,
    changeDynamicZoneComponents,
    contentTypes,
    components,
    createSchema,
    createComponentSchema,
    deleteComponent,
    deleteContentType,
    editCustomFieldAttribute,
    updateSchema,
    nestedComponents,
    sortedContentTypesList,
    updateComponentSchema,
    updateComponentUid,
    reservedNames,
  } = useDataManager();

  const {
    componentToCreate,
    formErrors,
    initialData,
    isCreatingComponentWhileAddingAField,
    modifiedData,
  } = reducerState;

  const type =
    forTarget === 'component'
      ? components[targetUid as Internal.UID.Component]
      : contentTypes[targetUid as Internal.UID.ContentType];

  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<PendingSubmit | null>(null);

  const checkFieldNameChanges = (): AnyAttribute[] | false => {
    // Only check when editing an attribute
    if (actionType !== 'edit' || modalType !== 'attribute') {
      return false;
    }

    const oldName = initialData.name;
    const oldEnum = initialData.enum;
    const newEnum = modifiedData.enum;

    // Get all attributes from the content type schema
    const contentTypeAttributes: AnyAttribute[] = type?.attributes ?? [];

    // Find all fields that reference this field in their conditions
    const referencedFields = contentTypeAttributes.filter((attr) => {
      if (attr.conditions === undefined) {
        return false;
      }

      const condition = attr.conditions.visible;
      if (condition === undefined) {
        return false;
      }

      const conditionEntry = Object.entries(condition)[0];
      if (conditionEntry === undefined) {
        return false;
      }

      const [, conditions] = conditionEntry;
      const [fieldVar, value] = conditions;

      // Check if this condition references our field
      if (fieldVar.var !== oldName) {
        return false;
      }

      // If it's an enum field, also check if the value is being deleted/changed
      if (oldEnum !== undefined && newEnum !== undefined) {
        const deletedOrChangedValues = oldEnum.filter(
          (oldValue: string) => !newEnum.includes(oldValue)
        );
        return typeof value === 'string' && deletedOrChangedValues.includes(value);
      }

      return true;
    });

    // If any fields reference this field, return them
    if (referencedFields.length > 0) {
      return referencedFields;
    }

    return false;
  };

  React.useEffect(() => {
    if (isOpen) {
      const collectionTypesForRelation = sortedContentTypesList.filter(
        isAllowedContentTypesForRelations
      );

      if (actionType === 'edit' && modalType === 'attribute' && forTarget === 'contentType') {
        trackUsage('willEditFieldOfContentType');
      }

      // Case:
      // the user opens the modal chooseAttributes
      // selects dynamic zone => set the field name
      // then goes to step 1 (the modal is addComponentToDynamicZone) and finally reloads the app.
      // In this particular if the user tries to add components to the zone it will pop an error since the dz is unknown
      const foundDynamicZoneTarget =
        findAttribute(get(type, 'schema.attributes', []), dynamicZoneTarget) || null;

      // Create content type we need to add the default option draftAndPublish
      if (modalType === 'contentType' && actionType === 'create') {
        dispatch(
          actions.setDataToEdit({
            data: {
              draftAndPublish: true,
            },
          })
        );
      }

      // Edit content type
      if (modalType === 'contentType' && actionType === 'edit') {
        dispatch(
          actions.setDataToEdit({
            data: {
              displayName: type.info.displayName,
              draftAndPublish: type.options?.draftAndPublish,
              kind: type.modelType === 'contentType' ? type.kind : 'collectionType',
              pluginOptions: type.pluginOptions,
              pluralName: type.modelType === 'contentType' ? type.info.pluralName : '',
              singularName: type.modelType === 'contentType' ? type.info.singularName : '',
            },
          })
        );
      }

      // Edit component
      if (modalType === 'component' && actionType === 'edit') {
        dispatch(
          actions.setDataToEdit({
            data: {
              displayName: type.info.displayName,
              category: type.modelType === 'component' ? type.category : '',
              icon: type.info.icon,
            },
          })
        );
      }

      // Special case for the dynamic zone
      if (modalType === 'addComponentToDynamicZone' && actionType === 'edit') {
        const attributeToEdit = {
          ...foundDynamicZoneTarget,
          // We filter the available components
          // Because this modal is only used for adding components
          components: [],
          name: dynamicZoneTarget,
          createComponent: false,
          componentToCreate: { type: 'component' as const },
        };

        dispatch(
          actions.setDynamicZoneDataSchema({
            attributeToEdit,
          })
        );
      }

      // Set the predefined data structure to create an attribute
      if (attributeType) {
        const attributeToEditNotFormatted = findAttribute(
          get(type, ['attributes'], []),
          attributeName
        );
        const attributeToEdit = {
          ...attributeToEditNotFormatted,
          name: attributeName,
        };

        // We need to set the repeatable key to false when editing a component
        // The API doesn't send this info
        if (attributeType === 'component' && actionType === 'edit') {
          if (!('repeatable' in attributeToEdit) || !attributeToEdit.repeatable) {
            set(attributeToEdit, 'repeatable', false);
          }
        }

        if (modalType === 'customField') {
          if (actionType === 'edit') {
            dispatch(
              actions.setCustomFieldDataSchema({
                isEditing: true,
                modifiedDataToSetForEditing: attributeToEdit as FormModalData,
                uid: type.uid,
              })
            );
          } else {
            dispatch(
              actions.setCustomFieldDataSchema({
                customField: {
                  type: customField?.type ?? '',
                  options: customField?.options,
                },
                isEditing: false,
                modifiedDataToSetForEditing: attributeToEdit as FormModalData,
                uid: type.uid,
              })
            );
          }
        } else {
          dispatch(
            actions.setAttributeDataSchema({
              attributeType,
              nameToSetForRelation: get(collectionTypesForRelation, ['0', 'title'], 'error'),
              targetUid: get(collectionTypesForRelation, ['0', 'uid'], 'error'),
              isEditing: actionType === 'edit',
              modifiedDataToSetForEditing: attributeToEdit as FormModalData,
              step,
              uid: type.uid,
            })
          );
        }
      }
    } else {
      dispatch(actions.resetProps());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionType, attributeName, attributeType, dynamicZoneTarget, forTarget, isOpen, modalType]);

  const isCreatingContentType = modalType === 'contentType';
  const isCreatingComponent = modalType === 'component';
  const isCreatingAttribute = modalType === 'attribute';
  const isCreatingCustomFieldAttribute = modalType === 'customField';
  const isComponentAttribute = attributeType === 'component' && isCreatingAttribute;
  const isCreating = actionType === 'create';
  const isCreatingComponentFromAView =
    get(modifiedData, 'createComponent', false) || isCreatingComponentWhileAddingAField;
  const isInFirstComponentStep = step === '1';
  const isPickingAttribute = modalType === 'chooseAttribute';
  const uid = createUid(modifiedData.singularName || '');
  const attributes = get(type, ['attributes'], null) as {
    name: string;
  }[];

  const checkFormValidity = async () => {
    let schema;
    const dataToValidate =
      isCreatingComponentFromAView && step === '1'
        ? get(modifiedData, 'componentToCreate', {})
        : modifiedData;
    // Check form validity for content type
    if (isCreatingContentType) {
      schema = forms.contentType.schema(
        Object.keys(contentTypes),
        actionType === 'edit',
        // currentUID
        (type?.uid ?? null) as Internal.UID.ContentType,
        reservedNames,
        ctbFormsAPI,
        contentTypes
      );

      // Check form validity for component
      // This is happening when the user click on the link from the left menu
    } else if (isCreatingComponent) {
      schema = forms.component.schema(
        Object.keys(components) as Internal.UID.Component[],
        toStringValue(modifiedData.category),
        reservedNames,
        actionType === 'edit',
        components,
        toStringValue(modifiedData.displayName),
        (type?.uid ?? null) as Internal.UID.Component
        // ctbFormsAPI
      );
    } else if (isCreatingCustomFieldAttribute) {
      schema = forms.customField.schema({
        schemaAttributes: get(type, ['attributes'], []),
        attributeType: customField!.type,
        reservedNames,
        schemaData: { modifiedData, initialData },
        ctbFormsAPI,
        customFieldValidator: customField!.options?.validator,
      });

      // Check for validity for creating a component
      // This is happening when the user creates a component "on the fly"
      // Since we temporarily store the component info in another object
      // The data is set in the componentToCreate key
    } else if (isComponentAttribute && isCreatingComponentFromAView && isInFirstComponentStep) {
      schema = forms.component.schema(
        Object.keys(components) as Internal.UID.Component[],
        toStringValue(get(modifiedData, 'componentToCreate.category', '')),
        reservedNames,
        actionType === 'edit',
        components,
        toStringValue(modifiedData.componentToCreate?.displayName)
      );

      // Check form validity for creating a 'common attribute'
      // We need to make sure that it is independent from the step
    } else if (isCreatingAttribute && !isInFirstComponentStep) {
      const computedAttributeType = attributeType === 'relation' ? 'relation' : modifiedData.type;

      let alreadyTakenTargetContentTypeAttributes: Array<{ name: string }> = [];

      if (computedAttributeType === 'relation') {
        const targetContentTypeUID = toStringValue(get(modifiedData, ['target'], ''));

        const targetContentTypeAttributes = get(
          contentTypes,
          [targetContentTypeUID as Internal.UID.ContentType, 'attributes'],
          []
        ) as Array<{ name: string }>;

        // Create an array with all the targetContentType attributes name
        // in order to prevent the user from creating a relation with a targetAttribute
        // that may exist in the other content type
        alreadyTakenTargetContentTypeAttributes = targetContentTypeAttributes.filter(
          ({ name: attrName }: { name: string }) => {
            // Keep all the target content type attributes when creating a relation
            if (actionType !== 'edit') {
              return true;
            }

            // Remove the already created one when editing
            return attrName !== initialData.targetAttribute;
          }
        );
      }
      schema = forms.attribute.schema(
        type,
        (computedAttributeType ?? 'string') as Parameters<typeof forms.attribute.schema>[1],
        reservedNames,
        alreadyTakenTargetContentTypeAttributes,
        { modifiedData, initialData },
        ctbFormsAPI
      );
    } else {
      // The user is either in the addComponentToDynamicZone modal or
      // in step 1 of the add component (modalType=attribute&attributeType=component) but not creating a component
      // eslint-disable-next-line no-lonely-if
      if (isInFirstComponentStep && isCreatingComponentFromAView) {
        schema = forms.component.schema(
          Object.keys(components) as Internal.UID.Component[],
          toStringValue(get(modifiedData, 'componentToCreate.category', '')),
          reservedNames,
          actionType === 'edit',
          components,
          toStringValue(modifiedData.componentToCreate?.displayName)
        );
      } else {
        // The form is valid
        // The case here is being in the addComponentToDynamicZone modal and not creating a component
        return;
      }
    }

    await schema.validate(dataToValidate, { abortEarly: false });
  };

  const handleChange = React.useCallback(
    ({ target: { name, value } }: { target: { name: string; value?: unknown } }) => {
      const namesThatCanResetToNullValue = [
        'enumName',
        'max',
        'min',
        'maxLength',
        'minLength',
        'regex',
        'default',
      ];

      let val;

      if (namesThatCanResetToNullValue.includes(name) && value === '') {
        val = null;
      } else if (name === 'enum') {
        // For enum values, ensure we're working with an array
        val = Array.isArray(value) ? value : [String(value ?? '')];
      } else {
        val = value;
      }

      const clonedErrors = Object.assign({}, formErrors);

      // Reset min error when modifying the max
      if (name === 'max') {
        delete clonedErrors.min;
      }

      // Same here
      if (name === 'maxLength') {
        delete clonedErrors.minLength;
      }

      // Since the onBlur is deactivated we remove the errors directly when changing an input
      delete clonedErrors[name];

      dispatch(
        actions.setErrors({
          errors: clonedErrors,
        })
      );

      dispatch(
        actions.onChange({
          keys: name.split('.'),
          value: val,
        })
      );
    },
    [dispatch, formErrors]
  );

  const submitForm = async (e: React.SyntheticEvent, shouldContinue = isCreating) => {
    try {
      await checkFormValidity();

      dispatch(
        actions.setErrors({
          errors: {},
        })
      );

      sendButtonAddMoreFieldEvent(shouldContinue);

      const ctTargetUid = targetUid;

      if (isCreatingContentType) {
        // Create the content type schema
        if (isCreating) {
          createSchema({
            data: {
              kind,
              displayName: toStringValue(modifiedData.displayName),
              draftAndPublish: toBooleanValue(modifiedData.draftAndPublish),
              pluginOptions: toRecordValue(modifiedData.pluginOptions),
              singularName: toStringValue(modifiedData.singularName),
              pluralName: toStringValue(modifiedData.pluralName),
            },
            uid,
          });

          // Redirect the user to the created content type
          navigate({ pathname: `/plugins/${pluginId}/content-types/${uid}` });

          onCloseModal();
        } else {
          // NOTE: we have to assume we have a CT here until we refactor more
          const contentType = type as ContentType;
          // We cannot switch from collection type to single when the modal is making relations other than oneWay or manyWay
          if (canEditContentType(contentType, modifiedData)) {
            onCloseModal();

            await updateSchema({
              uid: contentType.uid,
              data: {
                displayName: toStringValue(modifiedData.displayName),
                kind: toContentTypeKind(modifiedData.kind),
                draftAndPublish: toBooleanValue(modifiedData.draftAndPublish),
                pluginOptions: toRecordValue(modifiedData.pluginOptions),
              },
            });
          } else {
            toggleNotification({
              type: 'danger',
              message: formatMessage({ id: 'notification.contentType.relations.conflict' }),
            });
          }

          return;
        }
        // We are creating a component using the component modal from the left menu
      } else if (modalType === 'component') {
        if (isCreating) {
          // Create the component schema
          const componentCategory = toStringValue(modifiedData.category);
          const componentDisplayName = toStringValue(modifiedData.displayName);
          const componentUid = createComponentUid(componentDisplayName, componentCategory);

          createComponentSchema({
            data: {
              displayName: componentDisplayName,
              icon: toOptionalStringValue(modifiedData.icon),
            },
            uid: componentUid,
            componentCategory,
          });

          // Redirect the user to the created component
          navigate({
            pathname: `/plugins/${pluginId}/component-categories/${componentCategory}/${componentUid}`,
          });

          onCloseModal();

          return;
        } else {
          updateComponentSchema({
            data: {
              icon: toOptionalStringValue(modifiedData.icon),
              displayName: toStringValue(modifiedData.displayName),
            },
            componentUID: targetUid as Internal.UID.Component,
          });

          if (type.status === 'NEW') {
            const componentUid = createComponentUid(
              toStringValue(modifiedData.displayName),
              toStringValue(modifiedData.category)
            );

            updateComponentUid({
              componentUID: targetUid as Internal.UID.Component,
              newComponentUID: componentUid,
            });

            navigate({
              pathname: `/plugins/${pluginId}/component-categories/${toStringValue(modifiedData.category)}/${componentUid}`,
            });
          }

          // Close the modal
          onCloseModal();

          return;
        }
      } else if (isCreatingCustomFieldAttribute) {
        const customFieldAttributeUpdate = {
          attributeToSet: { ...modifiedData, customField: customFieldUid },
          forTarget,
          targetUid,
          name: toStringValue(initialData.name),
        };

        if (actionType === 'edit') {
          editCustomFieldAttribute(customFieldAttributeUpdate);
        } else {
          addCustomFieldAttribute(customFieldAttributeUpdate);
        }

        if (shouldContinue) {
          onNavigateToChooseAttributeModal({
            forTarget,
            targetUid: ctTargetUid,
          });
        } else {
          onCloseModal();
        }

        return;
      } else if (isCreatingAttribute && !isCreatingComponentFromAView) {
        const isDynamicZoneAttribute = attributeType === 'dynamiczone';

        // The user is creating a DZ (he had entered the name of the dz)
        if (isDynamicZoneAttribute) {
          if (actionType === 'create') {
            addAttribute({
              attributeToSet: modifiedData,
              forTarget,
              targetUid,
            });
          } else {
            editAttribute({
              attributeToSet: modifiedData,
              forTarget,
              targetUid,
              name: toStringValue(initialData.name),
            });
          }

          // Adding a component to a dynamiczone is not the same logic as creating a simple field
          // so the search is different
          if (isCreating) {
            // Step 1 of adding a component to a DZ, the user has the option to create a component
            dispatch(actions.resetPropsAndSetTheFormForAddingACompoToADz());

            setActiveTab('basic');
            onNavigateToAddCompoToDZModal({ dynamicZoneTarget: toStringValue(modifiedData.name) });
          } else {
            onCloseModal();
          }

          return;
        }

        // Normal fields like boolean relations or dynamic zone
        if (!isComponentAttribute) {
          if (actionType === 'create') {
            addAttribute({
              attributeToSet: modifiedData,
              forTarget,
              targetUid,
            });
          } else {
            editAttribute({
              attributeToSet: modifiedData,
              forTarget,
              targetUid,
              name: toStringValue(initialData.name),
            });
          }

          if (shouldContinue) {
            onNavigateToChooseAttributeModal({
              forTarget,
              targetUid: ctTargetUid,
            });
          } else {
            onCloseModal();
          }

          return;

          // Adding an existing component
        }
        // eslint-disable-next-line no-lonely-if
        if (isInFirstComponentStep) {
          // Navigate the user to step 2
          onNavigateToCreateComponentStep2();

          // Clear the reducer and prepare the modified data
          // This way we don't have to add some logic to re-run the useEffect
          // The first step is either needed to create a component or just to navigate
          // To the modal for adding a "common field"
          dispatch(
            actions.resetPropsAndSetFormForAddingAnExistingCompo({
              uid: type.uid,
            })
          );

          // We don't want all the props to be reset
          return;

          // Here we are in step 2
          // The step 2 is also use to edit an attribute that is a component
        }

        if (actionType === 'create') {
          addAttribute({
            attributeToSet: modifiedData,
            forTarget,
            targetUid,
          });
        } else {
          // Ensure conditions are explicitly set to undefined if they were removed
          // Explicitly set conditions to undefined when they're removed to distinguish between:
          // 1. missing property: "don't change existing conditions" (partial update)
          // 2. undefined property: "delete conditions" (explicit removal)
          // This allows the backend to detect user intent:
          // { name: "field" } vs { name: "field", conditions: undefined }
          // without this, deleted conditions would be preserved by the backend's
          // reuseUnsetPreviousProperties function.
          const attributeData = { ...modifiedData };
          if (!('conditions' in modifiedData) || modifiedData.conditions === undefined) {
            // Explicitly add the conditions key with undefined value
            attributeData.conditions = undefined;
          }

          editAttribute({
            attributeToSet: attributeData,
            forTarget,
            targetUid,
            name: toStringValue(initialData.name),
          });
        }

        if (shouldContinue) {
          onNavigateToChooseAttributeModal({
            forTarget,
            targetUid,
          });
        } else {
          onCloseModal();
        }

        // We don't need to end the loop here we want the reducer to be reinitialized

        // Logic for creating a component without clicking on the link in
        // the left menu
        // We need to separate the logic otherwise the component would be created
        // even though the user didn't set any field
        // We need to prevent the component from being created if the user closes the modal at step 2 without any submission
      } else if (isCreatingAttribute && isCreatingComponentFromAView) {
        // Step 1
        if (isInFirstComponentStep) {
          // Here the search could be refactored since it is the same as the case from above
          // Navigate the user to step 2

          trackUsage('willCreateComponentFromAttributesModal');

          // Here we clear the reducer state but we also keep the created component
          // If we were to create the component before
          dispatch(
            actions.resetPropsAndSaveCurrentData({
              uid: type.uid,
            })
          );

          onNavigateToCreateComponentStep2();

          // Terminate because we don't want the reducer to be entirely reset
          return;

          // Step 2 of creating a component (which is setting the attribute name in the parent's schema)
        }
        // We are destructuring because the modifiedData object doesn't have the appropriate format to create a field
        const draftComponent = toComponentDraft(componentToCreate);
        // Create a the component temp UID
        // This could be refactored but I think it's more understandable to separate the logic
        const componentUid = createComponentUid(
          draftComponent.displayName,
          draftComponent.category
        );
        // Create the component first and add it to the components data
        createComponentSchema({
          // Component data
          data: {
            icon: draftComponent.icon,
            displayName: draftComponent.displayName,
          },
          uid: componentUid,
          componentCategory: draftComponent.category,
        });

        // Add the field to the schema
        addAttribute({
          attributeToSet: modifiedData,
          forTarget,
          targetUid,
        });

        dispatch(actions.resetProps());

        // Open modal attribute for adding attr to component
        if (shouldContinue) {
          onNavigateToChooseAttributeModal({ forTarget: 'component', targetUid: componentUid });
        } else {
          onCloseModal();
        }

        return;
      } else {
        // The modal is addComponentToDynamicZone
        if (isInFirstComponentStep) {
          if (isCreatingComponentFromAView) {
            const draftComponent = toComponentDraft(modifiedData.componentToCreate);
            const componentUid = createComponentUid(
              draftComponent.displayName,
              draftComponent.category
            );
            // Create the component first and add it to the components data
            createComponentSchema({
              data: {
                displayName: draftComponent.displayName,
                icon: draftComponent.icon,
              },
              uid: componentUid,
              componentCategory: draftComponent.category,
            });
            // Add the created component to the DZ
            // We don't want to remove the old ones
            addCreatedComponentToDynamicZone({
              forTarget,
              targetUid,
              dynamicZoneTarget,
              componentsToAdd: [componentUid],
            });

            // The Dynamic Zone and the component is created
            // Open the modal to add fields to the created component
            onNavigateToChooseAttributeModal({ forTarget: 'component', targetUid: componentUid });
          } else {
            // Add the components to the DZ
            changeDynamicZoneComponents({
              forTarget,
              targetUid,
              dynamicZoneTarget,
              newComponents: modifiedData.components ?? [],
            });

            onCloseModal();
          }
        } else {
          console.error('This case is not handled');
        }

        return;
      }

      dispatch(actions.resetProps());
    } catch (err: unknown) {
      if (yup.ValidationError.isError(err)) {
        const errors = getYupInnerErrors(err);

        dispatch(
          actions.setErrors({
            errors,
          })
        );
      }
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent, shouldContinue = isCreating) => {
    e.preventDefault();

    // Check for field name changes when clicking Finish
    const referencedFields = checkFieldNameChanges();
    if (referencedFields) {
      setPendingSubmit({ e, shouldContinue });
      setShowWarningDialog(true);
      return;
    }

    await submitForm(e, shouldContinue);
  };

  const handleConfirmClose = () => {
    // eslint-disable-next-line no-alert
    const confirm = window.confirm(
      formatMessage({
        id: 'window.confirm.close-modal.file',
        defaultMessage: 'Are you sure? Your changes will be lost.',
      })
    );

    if (confirm) {
      onCloseModal();
      dispatch(actions.resetProps());
    }
  };

  const handleClosed = () => {
    // Close the modal
    if (!isEqual(modifiedData, initialData)) {
      handleConfirmClose();
    } else {
      onCloseModal();
      // Reset the reducer
      dispatch(actions.resetProps());
    }
  };

  const sendAdvancedTabEvent = (tab: string) => {
    if (tab !== 'advanced') {
      return;
    }

    if (isCreatingContentType) {
      trackUsage('didSelectContentTypeSettings');

      return;
    }

    if (forTarget === 'contentType') {
      trackUsage('didSelectContentTypeFieldSettings');
    }
  };

  const sendButtonAddMoreFieldEvent = (shouldContinue: boolean) => {
    if (
      modalType === 'attribute' &&
      forTarget === 'contentType' &&
      attributeType !== 'dynamiczone' &&
      shouldContinue
    ) {
      trackUsage('willAddMoreFieldToContentType');
    }
  };

  const shouldDisableAdvancedTab = () => {
    if (modalType === 'component') {
      return true;
    }

    if (has(modifiedData, 'createComponent')) {
      return true;
    }

    return false;
  };

  // Display data for the attributes picker modal
  const displayedAttributes = getAttributesToDisplay(
    forTarget,
    targetUid,
    // We need the nested components so we know when to remove the component option
    nestedComponents
  );

  if (!modalType) {
    return null;
  }

  const formToDisplay = get(forms, [modalType, 'form'], {
    advanced: () => ({
      sections: [],
    }),
    base: () => ({
      sections: [],
    }),
  });

  const isAddingAComponentToAnotherComponent = forTarget === 'component';

  const genericInputProps = {
    customInputs: {
      'allowed-types-select': AllowedTypesSelect,
      'boolean-radio-group': BooleanRadioGroup,
      'checkbox-with-number-field': CheckboxWithNumberField,
      'icon-picker': IconPicker,
      'content-type-radio-group': ContentTypeRadioGroup,
      'radio-group': CustomRadioGroup,
      relation: Relation,
      'select-category': SelectCategory,
      'select-component': SelectComponent,
      'select-components': SelectComponents,
      'select-default-boolean': BooleanDefaultValueSelect,
      'select-number': SelectNumber,
      'select-date': SelectDateType,
      'toggle-draft-publish': DraftAndPublishToggle,
      'text-plural': PluralName,
      'text-singular': SingularName,
      'textarea-enum': TextareaEnum,
      'condition-form': ConditionForm,
      ...inputsFromPlugins,
    },
    componentToCreate,
    dynamicZoneTarget,
    formErrors,
    isAddingAComponentToAnotherComponent,
    isCreatingComponentWhileAddingAField,
    mainBoxHeader: get(type, ['info', 'displayName'], ''),
    modifiedData,
    naturePickerType: forTarget,
    isCreating,
    targetUid,
    forTarget,
    contentTypeSchema: type,
  };

  const advancedForm = formToDisplay.advanced({
    data: modifiedData,
    type: attributeType,
    step,
    actionType,
    attributes,
    extensions: ctbFormsAPI,
    forTarget,
    contentTypeSchema: type || {},
    customField,
  }).sections;
  const baseForm = formToDisplay.base({
    data: modifiedData,
    type: attributeType,
    step,
    actionType,
    attributes,
    extensions: ctbFormsAPI,
    forTarget,
    contentTypeSchema: type || {},
    customField,
  }).sections;

  const baseFormInputNames = getFormInputNames(baseForm);

  const advancedFormInputNames = getFormInputNames(advancedForm);
  const doesBaseFormHasError = Object.keys(formErrors).some((key) =>
    baseFormInputNames.includes(key)
  );

  const doesAdvancedFormHasError = Object.keys(formErrors).some((key) =>
    advancedFormInputNames.includes(key)
  );

  const schemaKind = get(contentTypes, [targetUid, 'kind']);

  const checkIsEditingFieldName = () =>
    actionType === 'edit' && attributes.every(({ name }) => name !== modifiedData?.name);

  const handleClickFinish = () => {
    if (checkIsEditingFieldName()) {
      trackUsage('didEditFieldNameOnContentType');
    }
    dispatchGuidedTour({
      type: 'set_completed_actions',
      payload: [GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.addField],
    });
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleClosed}>
      <Modal.Content>
        <Dialog.Root open={showWarningDialog} onOpenChange={setShowWarningDialog}>
          <Dialog.Trigger />
          <ConfirmDialog
            onConfirm={() => {
              if (pendingSubmit !== null) {
                const { e, shouldContinue } = pendingSubmit;
                setShowWarningDialog(false);
                setPendingSubmit(null);
                submitForm(e, shouldContinue);
              }
            }}
            onCancel={() => {
              setShowWarningDialog(false);
              setPendingSubmit(null);
            }}
          >
            {(() => {
              const referencedFields = checkFieldNameChanges();
              if (referencedFields === false) return null;

              const fieldNames = referencedFields.map((field) => field.name).join(', ');
              const oldEnum = initialData.enum;
              const newEnum = modifiedData.enum;
              const isEnum = Array.isArray(oldEnum) && Array.isArray(newEnum);

              if (isEnum === true) {
                const deletedOrChangedValues = oldEnum.filter(
                  (value: string) => !newEnum.includes(value)
                );

                return (
                  <Box>
                    <Typography>
                      {formatMessage({
                        id: 'form.attribute.condition.enum-change-warning',
                        defaultMessage:
                          'The following fields have conditions that depend on this field: ',
                      })}
                      <Typography fontWeight="bold">{fieldNames}</Typography>
                      {formatMessage({
                        id: 'form.attribute.condition.enum-change-warning-values',
                        defaultMessage: '. Changing or removing the enum values ',
                      })}
                      <Typography fontWeight="bold">{deletedOrChangedValues.join(', ')}</Typography>
                      {formatMessage({
                        id: 'form.attribute.condition.enum-change-warning-end',
                        defaultMessage: ' will break these conditions. Do you want to proceed?',
                      })}
                    </Typography>
                  </Box>
                );
              }

              return (
                <Box>
                  <Typography>
                    {formatMessage({
                      id: 'form.attribute.condition.field-change-warning',
                      defaultMessage:
                        'The following fields have conditions that depend on this field: ',
                    })}
                    <Typography fontWeight="bold">{fieldNames}</Typography>
                    {formatMessage({
                      id: 'form.attribute.condition.field-change-warning-end',
                      defaultMessage:
                        '. Renaming it will break these conditions. Do you want to proceed?',
                    })}
                  </Typography>
                </Box>
              );
            })()}
          </ConfirmDialog>
        </Dialog.Root>
        <FormModalHeader
          actionType={actionType}
          attributeName={attributeName}
          contentTypeKind={kind as IconByType}
          dynamicZoneTarget={dynamicZoneTarget}
          modalType={modalType}
          forTarget={forTarget}
          targetUid={targetUid}
          attributeType={attributeType as IconByType}
          customFieldUid={customFieldUid}
          showBackLink={showBackLink}
        />
        {isPickingAttribute && (
          <AttributeOptions
            attributes={displayedAttributes}
            forTarget={forTarget}
            kind={schemaKind || 'collectionType'}
          />
        )}
        {!isPickingAttribute && (
          <FormComponent onSubmit={handleSubmit}>
            <Modal.Body>
              <Tabs.Root
                variant="simple"
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value as Tab);
                  sendAdvancedTabEvent(value);
                }}
                hasError={
                  doesBaseFormHasError ? 'basic' : doesAdvancedFormHasError ? 'advanced' : undefined
                }
              >
                <Flex justifyContent="space-between">
                  <FormModalSubHeader
                    actionType={actionType}
                    forTarget={forTarget}
                    kind={kind}
                    step={step ?? undefined}
                    modalType={modalType}
                    attributeType={attributeType}
                    attributeName={attributeName}
                    customField={customField}
                  />
                  <Tabs.List>
                    <Tabs.Trigger value="basic">
                      {formatMessage({
                        id: getTrad('popUpForm.navContainer.base'),
                        defaultMessage: 'Basic settings',
                      })}
                    </Tabs.Trigger>
                    <Tabs.Trigger value="advanced" disabled={shouldDisableAdvancedTab()}>
                      {formatMessage({
                        id: getTrad('popUpForm.navContainer.advanced'),
                        defaultMessage: 'Advanced settings',
                      })}
                    </Tabs.Trigger>
                  </Tabs.List>
                </Flex>
                <Divider marginBottom={6} />
                <Tabs.Content value="basic">
                  <Flex direction="column" alignItems="stretch" gap={6}>
                    <TabForm
                      form={baseForm}
                      formErrors={formErrors}
                      genericInputProps={genericInputProps}
                      modifiedData={modifiedData}
                      onChange={handleChange}
                    />
                  </Flex>
                </Tabs.Content>
                <Tabs.Content value="advanced">
                  <Flex direction="column" alignItems="stretch" gap={6}>
                    <TabForm
                      form={advancedForm}
                      formErrors={formErrors}
                      genericInputProps={genericInputProps}
                      modifiedData={modifiedData}
                      onChange={handleChange}
                    />
                  </Flex>
                </Tabs.Content>
              </Tabs.Root>
            </Modal.Body>
            <Modal.Footer>
              <Button
                type="button"
                variant="tertiary"
                onClick={(e) => {
                  e.preventDefault();
                  handleClosed();
                }}
              >
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
              {/* TODO: refactor this component. Nuf said. */}
              <FormModalEndActions
                deleteContentType={() => deleteContentType(targetUid as Internal.UID.ContentType)}
                deleteComponent={() => deleteComponent(targetUid as Internal.UID.Component)}
                isAttributeModal={modalType === 'attribute'}
                isCustomFieldModal={modalType === 'customField'}
                isComponentToDzModal={modalType === 'addComponentToDynamicZone'}
                isComponentAttribute={attributeType === 'component'}
                isComponentModal={modalType === 'component'}
                isContentTypeModal={modalType === 'contentType'}
                isCreatingComponent={actionType === 'create'}
                isCreatingDz={actionType === 'create'}
                isCreatingComponentAttribute={modifiedData.createComponent || false}
                isCreatingComponentInDz={modifiedData.createComponent || false}
                isCreatingComponentWhileAddingAField={isCreatingComponentWhileAddingAField}
                isCreatingContentType={actionType === 'create'}
                isEditingAttribute={actionType === 'edit'}
                isDzAttribute={attributeType === 'dynamiczone'}
                isInFirstComponentStep={step === '1'}
                onSubmitAddComponentAttribute={handleSubmit}
                onSubmitAddComponentToDz={handleSubmit}
                onSubmitCreateComponent={handleSubmit}
                onSubmitCreateContentType={handleSubmit}
                onSubmitCreateDz={handleSubmit}
                onSubmitEditAttribute={handleSubmit}
                onSubmitEditComponent={handleSubmit}
                onSubmitEditContentType={handleSubmit}
                onSubmitEditCustomFieldAttribute={handleSubmit}
                onSubmitEditDz={handleSubmit}
                onClickFinish={handleClickFinish}
              />
            </Modal.Footer>
          </FormComponent>
        )}
      </Modal.Content>
    </Modal.Root>
  );
};
