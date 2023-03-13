import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  getYupInnerErrors,
  useTracking,
  useNotification,
  useStrapiApp,
  useCustomFields,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import get from 'lodash/get';
import has from 'lodash/has';
import set from 'lodash/set';
import toLower from 'lodash/toLower';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import {
  Box,
  Button,
  Divider,
  ModalLayout,
  ModalBody,
  ModalFooter,
  Tabs,
  Tab,
  TabGroup,
  TabPanels,
  TabPanel,
  Flex,
} from '@strapi/design-system';
import { isEqual } from 'lodash';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import useFormModalNavigation from '../../hooks/useFormModalNavigation';
// New compos
import AllowedTypesSelect from '../AllowedTypesSelect';
import AttributeOptions from '../AttributeOptions';
import DraftAndPublishToggle from '../DraftAndPublishToggle';
import FormModalHeader from '../FormModalHeader';
import FormModalEndActions from '../FormModalEndActions';
import FormModalSubHeader from '../FormModalSubHeader';

import BooleanDefaultValueSelect from '../BooleanDefaultValueSelect';
import BooleanRadioGroup from '../BooleanRadioGroup';
import CheckboxWithNumberField from '../CheckboxWithNumberField';
import CustomRadioGroup from '../CustomRadioGroup';
import ContentTypeRadioGroup from '../ContentTypeRadioGroup';
import Relation from '../Relation';
import PluralName from '../PluralName';
import SelectCategory from '../SelectCategory';
import SelectComponent from '../SelectComponent';
import SelectComponents from '../SelectComponents';
import SelectDateType from '../SelectDateType';
import SelectNumber from '../SelectNumber';
import SingularName from '../SingularName';
import TabForm from '../TabForm';
import TextareaEnum from '../TextareaEnum';
import findAttribute from '../../utils/findAttribute';
import { getTrad, isAllowedContentTypesForRelations } from '../../utils';
import { canEditContentType, getAttributesToDisplay, getFormInputNames } from './utils';
import forms from './forms';
import { createComponentUid, createUid } from './utils/createUid';

import makeSelectFormModal from './selectors';
import {
  SET_DATA_TO_EDIT,
  SET_DYNAMIC_ZONE_DATA_SCHEMA,
  SET_ATTRIBUTE_DATA_SCHEMA,
  SET_CUSTOM_FIELD_DATA_SCHEMA,
  SET_ERRORS,
  ON_CHANGE,
  RESET_PROPS_AND_SET_THE_FORM_FOR_ADDING_A_COMPO_TO_A_DZ,
  RESET_PROPS_AND_SET_FORM_FOR_ADDING_AN_EXISTING_COMPO,
  RESET_PROPS_AND_SAVE_CURRENT_DATA,
  RESET_PROPS,
} from './constants';

/* eslint-disable indent */
/* eslint-disable react/no-array-index-key */

const FormModal = () => {
  const {
    onCloseModal,
    onNavigateToChooseAttributeModal,
    onNavigateToAddCompoToDZModal,
    onNavigateToCreateComponentStep2,
    actionType,
    attributeName,
    attributeType,
    customFieldUid,
    categoryName,
    dynamicZoneTarget,
    forTarget,
    modalType,
    isOpen,
    kind,
    step,
    targetUid,
  } = useFormModalNavigation();
  const customField = useCustomFields().get(customFieldUid);

  const tabGroupRef = useRef();

  const formModalSelector = useMemo(makeSelectFormModal, []);
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const reducerState = useSelector((state) => formModalSelector(state), shallowEqual);
  const { push } = useHistory();
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { getPlugin } = useStrapiApp();
  const ctbPlugin = getPlugin(pluginId);
  const ctbFormsAPI = ctbPlugin.apis.forms;
  const inputsFromPlugins = ctbFormsAPI.components.inputs;

  const {
    addAttribute,
    addCustomFieldAttribute,
    addCreatedComponentToDynamicZone,
    allComponentsCategories,
    changeDynamicZoneComponents,
    contentTypes,
    components,
    createSchema,
    deleteCategory,
    deleteData,
    editCategory,
    editCustomFieldAttribute,
    submitData,
    modifiedData: allDataSchema,
    nestedComponents,
    setModifiedData,
    sortedContentTypesList,
    updateSchema,
    reservedNames,
  } = useDataManager();

  const {
    componentToCreate,
    formErrors,
    initialData,
    isCreatingComponentWhileAddingAField,
    modifiedData,
  } = reducerState;

  const pathToSchema =
    forTarget === 'contentType' || forTarget === 'component' ? [forTarget] : [forTarget, targetUid];

  useEffect(() => {
    if (isOpen) {
      const collectionTypesForRelation = sortedContentTypesList.filter(
        isAllowedContentTypesForRelations
      );

      // Reset all the modification when opening the edit category modal
      if (modalType === 'editCategory') {
        setModifiedData();
      }

      if (actionType === 'edit' && modalType === 'attribute' && forTarget === 'contentType') {
        trackUsage('willEditFieldOfContentType');
      }

      const pathToAttributes = [...pathToSchema, 'schema', 'attributes'];

      // Case:
      // the user opens the modal chooseAttributes
      // selects dynamic zone => set the field name
      // then goes to step 1 (the modal is addComponentToDynamicZone) and finally reloads the app.
      // In this particular if the user tries to add components to the zone it will pop an error since the dz is unknown
      const foundDynamicZoneTarget =
        findAttribute(get(allDataSchema, pathToAttributes, []), dynamicZoneTarget) || null;

      // Edit category
      if (modalType === 'editCategory' && actionType === 'edit') {
        dispatch({
          type: SET_DATA_TO_EDIT,
          modalType,
          actionType,
          data: {
            name: categoryName,
          },
        });
      }

      // Create content type we need to add the default option draftAndPublish
      if (modalType === 'contentType' && actionType === 'create') {
        dispatch({
          type: SET_DATA_TO_EDIT,
          modalType,
          actionType,
          data: {
            draftAndPublish: true,
          },
          pluginOptions: {},
        });
      }

      // Edit content type
      if (modalType === 'contentType' && actionType === 'edit') {
        const { displayName, draftAndPublish, kind, pluginOptions, pluralName, singularName } = get(
          allDataSchema,
          [...pathToSchema, 'schema'],
          {
            displayName: null,
            pluginOptions: {},
            singularName: null,
            pluralName: null,
          }
        );

        dispatch({
          type: SET_DATA_TO_EDIT,
          actionType,
          modalType,
          data: {
            displayName,
            draftAndPublish,
            kind,
            pluginOptions,
            pluralName,
            singularName,
          },
        });
      }

      // Edit component
      if (modalType === 'component' && actionType === 'edit') {
        const data = get(allDataSchema, pathToSchema, {});

        dispatch({
          type: SET_DATA_TO_EDIT,
          actionType,
          modalType,
          data: {
            displayName: data.schema.displayName,
            category: data.category,
          },
        });
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
          componentToCreate: { type: 'component' },
        };

        dispatch({
          type: SET_DYNAMIC_ZONE_DATA_SCHEMA,
          attributeToEdit,
        });
      }

      // Set the predefined data structure to create an attribute
      if (attributeType) {
        const attributeToEditNotFormatted = findAttribute(
          get(allDataSchema, pathToAttributes, []),
          attributeName
        );
        const attributeToEdit = {
          ...attributeToEditNotFormatted,
          name: attributeName,
        };

        // We need to set the repeatable key to false when editing a component
        // The API doesn't send this info
        if (attributeType === 'component' && actionType === 'edit') {
          if (!attributeToEdit.repeatable) {
            set(attributeToEdit, 'repeatable', false);
          }
        }

        if (modalType === 'customField') {
          dispatch({
            type: SET_CUSTOM_FIELD_DATA_SCHEMA,
            customField,
            isEditing: actionType === 'edit',
            modifiedDataToSetForEditing: attributeToEdit,
            // NOTE: forTarget is used in the i18n middleware
            forTarget,
          });
        } else {
          dispatch({
            type: SET_ATTRIBUTE_DATA_SCHEMA,
            attributeType,
            nameToSetForRelation: get(collectionTypesForRelation, ['0', 'title'], 'error'),
            targetUid: get(collectionTypesForRelation, ['0', 'uid'], 'error'),
            isEditing: actionType === 'edit',
            modifiedDataToSetForEditing: attributeToEdit,
            step,
            forTarget,
          });
        }
      }
    } else {
      dispatch({ type: RESET_PROPS });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actionType,
    attributeName,
    attributeType,
    categoryName,
    dynamicZoneTarget,
    forTarget,
    isOpen,
    modalType,
  ]);

  // FIXME rename this constant
  const isCreatingContentType = modalType === 'contentType';
  const isCreatingComponent = modalType === 'component';
  const isCreatingAttribute = modalType === 'attribute';
  const isCreatingCustomFieldAttribute = modalType === 'customField';
  const isComponentAttribute = attributeType === 'component' && isCreatingAttribute;
  const isCreating = actionType === 'create';
  const isCreatingComponentFromAView =
    get(modifiedData, 'createComponent', false) || isCreatingComponentWhileAddingAField;
  const isInFirstComponentStep = step === '1';
  const isEditingCategory = modalType === 'editCategory';
  const isPickingAttribute = modalType === 'chooseAttribute';
  const uid = createUid(modifiedData.displayName || '');
  const attributes = get(allDataSchema, [...pathToSchema, 'schema', 'attributes'], null);

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
        get(allDataSchema, [...pathToSchema, 'uid'], null),
        reservedNames,
        ctbFormsAPI,
        contentTypes
      );

      // Check form validity for component
      // This is happening when the user click on the link from the left menu
    } else if (isCreatingComponent) {
      schema = forms.component.schema(
        Object.keys(components),
        modifiedData.category || '',
        reservedNames,
        actionType === 'edit',
        get(allDataSchema, [...pathToSchema, 'uid'], null),
        ctbFormsAPI
      );
    } else if (isCreatingCustomFieldAttribute) {
      schema = forms.customField.schema({
        schemaAttributes: get(allDataSchema, [...pathToSchema, 'schema', 'attributes'], []),
        attributeType: customField.type,
        reservedNames,
        schemaData: { modifiedData, initialData },
        ctbFormsAPI,
        customFieldValidator: customField.options?.validator,
      });

      // Check for validity for creating a component
      // This is happening when the user creates a component "on the fly"
      // Since we temporarily store the component info in another object
      // The data is set in the componentToCreate key
    } else if (isComponentAttribute && isCreatingComponentFromAView && isInFirstComponentStep) {
      schema = forms.component.schema(
        Object.keys(components),
        get(modifiedData, 'componentToCreate.category', ''),
        reservedNames,
        ctbFormsAPI
      );

      // Check form validity for creating a 'common attribute'
      // We need to make sure that it is independent from the step
    } else if (isCreatingAttribute && !isInFirstComponentStep) {
      const type = attributeType === 'relation' ? 'relation' : modifiedData.type;

      let alreadyTakenTargetContentTypeAttributes = [];

      if (type === 'relation') {
        const targetContentTypeUID = get(modifiedData, ['target'], null);

        const targetContentTypeAttributes = get(
          contentTypes,
          [targetContentTypeUID, 'schema', 'attributes'],
          []
        );

        // Create an array with all the targetContentType attributes name
        // in order to prevent the user from creating a relation with a targetAttribute
        // that may exist in the other content type
        alreadyTakenTargetContentTypeAttributes = targetContentTypeAttributes.filter(
          ({ name: attrName }) => {
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
        get(allDataSchema, pathToSchema, {}),
        type,
        reservedNames,
        alreadyTakenTargetContentTypeAttributes,
        { modifiedData, initialData },
        ctbFormsAPI
      );
    } else if (isEditingCategory) {
      schema = forms.editCategory.schema(allComponentsCategories, initialData, ctbFormsAPI);
    } else {
      // The user is either in the addComponentToDynamicZone modal or
      // in step 1 of the add component (modalType=attribute&attributeType=component) but not creating a component

      // eslint-disable-next-line no-lonely-if
      if (isInFirstComponentStep && isCreatingComponentFromAView) {
        schema = forms.component.schema(
          Object.keys(components),
          get(modifiedData, 'componentToCreate.category', ''),
          reservedNames,
          ctbFormsAPI
        );
      } else {
        // The form is valid
        // The case here is being in the addComponentToDynamicZone modal and not creating a component
        return;
      }
    }

    await schema.validate(dataToValidate, { abortEarly: false });
  };

  const handleChange = useCallback(
    ({ target: { name, value, type, ...rest } }) => {
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

      dispatch({
        type: SET_ERRORS,
        errors: clonedErrors,
      });

      dispatch({
        type: ON_CHANGE,
        keys: name.split('.'),
        value: val,
        ...rest,
      });
    },
    [dispatch, formErrors]
  );

  const handleSubmit = async (e, shouldContinue = isCreating) => {
    e.preventDefault();

    try {
      await checkFormValidity();

      sendButtonAddMoreFieldEvent(shouldContinue);
      const ctTargetUid = forTarget === 'components' ? targetUid : uid;

      if (isCreatingContentType) {
        // Create the content type schema
        if (isCreating) {
          createSchema({ ...modifiedData, kind }, modalType, uid);
          // Redirect the user to the created content type
          push({ pathname: `/plugins/${pluginId}/content-types/${uid}` });

          // Navigate to the choose attribute modal
          onNavigateToChooseAttributeModal({
            forTarget,
            targetUid: ctTargetUid,
          });
        } else {
          // We cannot switch from collection type to single when the modal is making relations other than oneWay or manyWay
          if (canEditContentType(allDataSchema, modifiedData)) {
            onCloseModal();

            submitData(modifiedData);
          } else {
            toggleNotification({
              type: 'warning',
              message: { id: 'notification.contentType.relations.conflict' },
            });
          }

          return;
        }
        // We are creating a component using the component modal from the left menu
      } else if (modalType === 'component') {
        if (isCreating) {
          // Create the component schema
          const componentUid = createComponentUid(modifiedData.displayName, modifiedData.category);
          const { category, ...rest } = modifiedData;

          createSchema(rest, 'component', componentUid, category);

          // Redirect the user to the created component
          push({
            pathname: `/plugins/${pluginId}/component-categories/${category}/${componentUid}`,
          });

          // Navigate to the choose attribute modal
          onNavigateToChooseAttributeModal({
            forTarget,
            targetUid: componentUid,
          });
        } else {
          updateSchema(modifiedData, modalType, targetUid);

          // Close the modal
          onCloseModal();

          return;
        }
      } else if (isEditingCategory) {
        if (toLower(initialData.name) === toLower(modifiedData.name)) {
          // Close the modal
          onCloseModal();

          return;
        }

        editCategory(initialData.name, modifiedData);

        return;
        // Add/edit a field to a content type
        // Add/edit a field to a created component (the end modal is not step 2)
      } else if (isCreatingCustomFieldAttribute) {
        const customFieldAttributeUpdate = {
          attributeToSet: { ...modifiedData, customField: customFieldUid },
          forTarget,
          targetUid,
          initialAttribute: initialData,
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
          addAttribute(modifiedData, forTarget, targetUid, actionType === 'edit', initialData);

          // Adding a component to a dynamiczone is not the same logic as creating a simple field
          // so the search is different
          if (isCreating) {
            // Step 1 of adding a component to a DZ, the user has the option to create a component
            dispatch({
              type: RESET_PROPS_AND_SET_THE_FORM_FOR_ADDING_A_COMPO_TO_A_DZ,
            });

            tabGroupRef.current._handlers.setSelectedTabIndex(0);

            onNavigateToAddCompoToDZModal({ dynamicZoneTarget: modifiedData.name });
          } else {
            onCloseModal();
          }

          return;
        }

        // Normal fields like boolean relations or dynamic zone
        if (!isComponentAttribute) {
          addAttribute(modifiedData, forTarget, targetUid, actionType === 'edit', initialData);

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
          dispatch({
            type: RESET_PROPS_AND_SET_FORM_FOR_ADDING_AN_EXISTING_COMPO,
            forTarget,
          });

          // We don't want all the props to be reset
          return;

          // Here we are in step 2
          // The step 2 is also use to edit an attribute that is a component
        }

        addAttribute(
          modifiedData,
          forTarget,
          targetUid,
          // This change the dispatched type
          // either 'EDIT_ATTRIBUTE' or 'ADD_ATTRIBUTE' in the DataManagerProvider
          actionType === 'edit',
          // This is for the edit part
          initialData,
          // Passing true will add the component to the components object
          // This way we can add fields to the added component (if it wasn't there already)
          true
        );

        if (shouldContinue) {
          onNavigateToChooseAttributeModal({
            forTarget,
            targetUid,
          });
        } else {
          onCloseModal();
        }

        // We don't need to end the loop here we want the reducer to be reinitialised

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
          dispatch({
            type: RESET_PROPS_AND_SAVE_CURRENT_DATA,
            forTarget,
          });

          onNavigateToCreateComponentStep2();

          // Terminate because we don't want the reducer to be entirely reset
          return;

          // Step 2 of creating a component (which is setting the attribute name in the parent's schema)
        }
        // We are destructuring because the modifiedData object doesn't have the appropriate format to create a field
        const { category, type, ...rest } = componentToCreate;
        // Create a the component temp UID
        // This could be refactored but I think it's more understandable to separate the logic
        const componentUid = createComponentUid(componentToCreate.displayName, category);
        // Create the component first and add it to the components data
        createSchema(
          // Component data
          rest,
          // Type will always be component
          // It will dispatch the CREATE_COMPONENT_SCHEMA action
          // So the component will be added in the main components object
          // This might not be needed if we don't allow navigation between entries while editing
          type,
          componentUid,
          category,
          // This will add the created component in the datamanager modifiedData components key
          // Like explained above we will be able to modify the created component structure
          isCreatingComponentFromAView
        );
        // Add the field to the schema
        addAttribute(modifiedData, forTarget, targetUid, false);

        dispatch({ type: RESET_PROPS });

        // Open modal attribute for adding attr to component
        if (shouldContinue) {
          onNavigateToChooseAttributeModal({ forTarget: 'components', targetUid: componentUid });
        } else {
          onCloseModal();
        }

        return;
      } else {
        // The modal is addComponentToDynamicZone
        if (isInFirstComponentStep) {
          if (isCreatingComponentFromAView) {
            const { category, type, ...rest } = modifiedData.componentToCreate;
            const componentUid = createComponentUid(
              modifiedData.componentToCreate.displayName,
              category
            );
            // Create the component first and add it to the components data
            createSchema(
              // Component data
              rest,
              // Type will always be component
              // It will dispatch the CREATE_COMPONENT_SCHEMA action
              // So the component will be added in the main components object
              // This might not be needed if we don't allow navigation between entries while editing
              type,
              componentUid,
              category,
              // This will add the created component in the datamanager modifiedData components key
              // Like explained above we will be able to modify the created component structure
              isCreatingComponentFromAView
            );
            // Add the created component to the DZ
            // We don't want to remove the old ones
            addCreatedComponentToDynamicZone(dynamicZoneTarget, [componentUid]);

            // The Dynamic Zone and the component is created
            // Open the modal to add fields to the created component
            onNavigateToChooseAttributeModal({ forTarget: 'components', targetUid: componentUid });
          } else {
            // Add the components to the DZ
            changeDynamicZoneComponents(dynamicZoneTarget, modifiedData.components);

            onCloseModal();
          }
        } else {
          console.error('This case is not handled');
        }

        return;
      }

      dispatch({
        type: RESET_PROPS,
      });
    } catch (err) {
      const errors = getYupInnerErrors(err);
      console.log({ err, errors });

      dispatch({
        type: SET_ERRORS,
        errors,
      });
    }
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

      dispatch({
        type: RESET_PROPS,
      });
    }
  };

  const handleClosed = () => {
    // Close the modal
    if (!isEqual(modifiedData, initialData)) {
      handleConfirmClose();
    } else {
      onCloseModal();
      // Reset the reducer
      dispatch({
        type: RESET_PROPS,
      });
    }
  };

  const sendAdvancedTabEvent = (tab) => {
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

  const sendButtonAddMoreFieldEvent = (shouldContinue) => {
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
    if (modalType === 'editCategory') {
      return true;
    }

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

  if (!isOpen) {
    return null;
  }

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

  const isAddingAComponentToAnotherComponent =
    forTarget === 'components' || forTarget === 'component';

  const genericInputProps = {
    customInputs: {
      'allowed-types-select': AllowedTypesSelect,
      'boolean-radio-group': BooleanRadioGroup,
      'checkbox-with-number-field': CheckboxWithNumberField,
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
      ...inputsFromPlugins,
    },
    componentToCreate,
    dynamicZoneTarget,
    formErrors,
    isAddingAComponentToAnotherComponent,
    isCreatingComponentWhileAddingAField,
    mainBoxHeader: get(allDataSchema, [...pathToSchema, 'schema', 'displayName'], ''),
    modifiedData,
    naturePickerType: forTarget,
    isCreating,
    targetUid,
    forTarget,
  };

  const advancedForm = formToDisplay.advanced({
    data: modifiedData,
    type: attributeType,
    step,
    actionType,
    attributes,
    extensions: ctbFormsAPI,
    forTarget,
    contentTypeSchema: allDataSchema.contentType || {},
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
    contentTypeSchema: allDataSchema.contentType || {},
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

  const schemaKind = get(contentTypes, [targetUid, 'schema', 'kind']);

  const checkIsEditingFieldName = () =>
    actionType === 'edit' && attributes.every(({ name }) => name !== modifiedData?.name);

  const handleClickFinish = () => {
    if (checkIsEditingFieldName()) {
      trackUsage('didEditFieldNameOnContentType');
    }
  };

  return (
    <ModalLayout onClose={handleClosed} labelledBy="title">
      <FormModalHeader
        actionType={actionType}
        attributeName={attributeName}
        categoryName={categoryName}
        contentTypeKind={kind}
        dynamicZoneTarget={dynamicZoneTarget}
        modalType={modalType}
        forTarget={forTarget}
        targetUid={targetUid}
        attributeType={attributeType}
        customFieldUid={customFieldUid}
      />
      {isPickingAttribute && (
        <AttributeOptions
          attributes={displayedAttributes}
          forTarget={forTarget}
          kind={schemaKind || 'collectionType'}
        />
      )}
      {!isPickingAttribute && (
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <TabGroup
              label="todo"
              id="tabs"
              variant="simple"
              ref={tabGroupRef}
              onTabChange={(selectedTab) => {
                if (selectedTab === 1) {
                  sendAdvancedTabEvent('advanced');
                }
              }}
            >
              <Flex justifyContent="space-between">
                <FormModalSubHeader
                  actionType={actionType}
                  forTarget={forTarget}
                  kind={kind}
                  step={step}
                  modalType={modalType}
                  attributeType={attributeType}
                  attributeName={attributeName}
                  customField={customField}
                />
                <Tabs>
                  <Tab hasError={doesBaseFormHasError}>
                    {formatMessage({
                      id: getTrad('popUpForm.navContainer.base'),
                      defaultMessage: 'Basic settings',
                    })}
                  </Tab>
                  <Tab
                    hasError={doesAdvancedFormHasError}
                    // TODO put aria-disabled
                    disabled={shouldDisableAdvancedTab()}
                  >
                    {formatMessage({
                      id: getTrad('popUpForm.navContainer.advanced'),
                      defaultMessage: 'Advanced settings',
                    })}
                  </Tab>
                </Tabs>
              </Flex>

              <Divider />

              <Box paddingTop={6}>
                <TabPanels>
                  <TabPanel>
                    <Flex direction="column" alignItems="stretch" gap={6}>
                      <TabForm
                        form={baseForm}
                        formErrors={formErrors}
                        genericInputProps={genericInputProps}
                        modifiedData={modifiedData}
                        onChange={handleChange}
                      />
                    </Flex>
                  </TabPanel>
                  <TabPanel>
                    <Flex direction="column" alignItems="stretch" gap={6}>
                      <TabForm
                        form={advancedForm}
                        formErrors={formErrors}
                        genericInputProps={genericInputProps}
                        modifiedData={modifiedData}
                        onChange={handleChange}
                      />
                    </Flex>
                  </TabPanel>
                </TabPanels>
              </Box>
            </TabGroup>
          </ModalBody>
          <ModalFooter
            endActions={
              <FormModalEndActions
                deleteCategory={deleteCategory}
                deleteContentType={deleteData}
                deleteComponent={deleteData}
                categoryName={initialData.name}
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
                isEditingCategory={modalType === 'editCategory'}
                isInFirstComponentStep={step === '1'}
                onSubmitAddComponentAttribute={handleSubmit}
                onSubmitAddComponentToDz={handleSubmit}
                onSubmitCreateComponent={handleSubmit}
                onSubmitCreateContentType={handleSubmit}
                onSubmitCreateDz={handleSubmit}
                onSubmitEditAttribute={handleSubmit}
                onSubmitEditCategory={handleSubmit}
                onSubmitEditComponent={handleSubmit}
                onSubmitEditContentType={handleSubmit}
                onSubmitEditCustomFieldAttribute={handleSubmit}
                onSubmitEditDz={handleSubmit}
                onClickFinish={handleClickFinish}
              />
            }
            startActions={
              <Button variant="tertiary" onClick={handleClosed}>
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
            }
          />
        </form>
      )}
    </ModalLayout>
  );
};

export default FormModal;
