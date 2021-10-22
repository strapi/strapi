import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTracking } from '@strapi/helper-plugin';
import FormModalNavigationContext from '../../contexts/FormModalNavigationContext';
import { INITIAL_STATE_DATA } from './constants';

const FormModalNavigationProvider = ({ children }) => {
  const [state, setFormModalNavigationState] = useState(INITIAL_STATE_DATA);
  const { trackUsage } = useTracking();

  const onChangeSettingTypeTab = nextTab => {
    setFormModalNavigationState(prevState => {
      return {
        ...prevState,
        settingType: nextTab,
      };
    });
  };

  const onClickSelectField = ({ attributeType, step }) => {
    if (state.forTarget === 'contentType') {
      trackUsage('didSelectContentTypeFieldType', { type: attributeType });
    }

    setFormModalNavigationState(prevState => {
      return {
        ...prevState,
        actionType: 'create',
        modalType: 'attribute',
        settingType: 'base',
        step,
        attributeType,
      };
    });
  };

  const onOpenModalAddComponentsToDZ = ({ dynamicZoneTarget, targetUid }) => {
    setFormModalNavigationState(prevState => {
      return {
        ...prevState,
        dynamicZoneTarget,
        targetUid,
        modalType: 'addComponentToDynamicZone',
        forTarget: 'contentType',
        settingType: 'base',
        step: '1',
        actionType: 'edit',
        isOpen: true,
      };
    });
  };

  const onOpenModalAddField = ({ forTarget, targetUid }) => {
    setFormModalNavigationState(prevState => {
      return {
        ...prevState,
        actionType: 'create',
        forTarget,
        targetUid,
        modalType: 'chooseAttribute',

        isOpen: true,
      };
    });
  };

  const onOpenModalCreateSchema = nextState => {
    setFormModalNavigationState(prevState => {
      return { ...prevState, ...nextState, isOpen: true };
    });
  };

  const onOpenModalEditCategory = categoryName => {
    setFormModalNavigationState(prevState => {
      return {
        ...prevState,
        categoryName,
        actionType: 'edit',
        modalType: 'editCategory',
        settingType: 'base',
        isOpen: true,
      };
    });
  };

  const onOpenModalEditField = ({ forTarget, targetUid, attributeName, attributeType, step }) => {
    setFormModalNavigationState(prevState => {
      return {
        ...prevState,
        modalType: 'attribute',
        actionType: 'edit',
        settingType: 'base',
        forTarget,
        targetUid,
        attributeName,
        attributeType,
        step,
        isOpen: true,
      };
    });
  };

  const onOpenModalEditSchema = ({ modalType, forTarget, targetUid, kind }) => {
    setFormModalNavigationState(prevState => {
      return {
        ...prevState,
        modalType,
        actionType: 'edit',
        settingType: 'base',
        forTarget,
        targetUid,
        kind,
        isOpen: true,
      };
    });
  };

  const onCloseModal = () => {
    setFormModalNavigationState(INITIAL_STATE_DATA);
  };

  const onNavigateToChooseAttributeModal = ({ forTarget, targetUid }) => {
    setFormModalNavigationState(prev => {
      return {
        ...prev,
        forTarget,
        targetUid,
        modalType: 'chooseAttribute',
      };
    });
  };

  const onNavigateToCreateComponentStep2 = () => {
    setFormModalNavigationState(prev => {
      return {
        ...prev,
        attributeType: 'component',
        modalType: 'attribute',
        settingType: 'base',
        step: '2',
      };
    });
  };

  const onNavigateToAddCompoToDZModal = ({ dynamicZoneTarget }) => {
    setFormModalNavigationState(prev => {
      return {
        ...prev,
        dynamicZoneTarget,
        modalType: 'addComponentToDynamicZone',
        actionType: 'create',
        step: '1',
        attributeType: null,
        attributeName: null,
      };
    });
  };

  return (
    <FormModalNavigationContext.Provider
      value={{
        ...state,
        onChangeSettingTypeTab,
        onClickSelectField,
        onCloseModal,
        onNavigateToChooseAttributeModal,
        onNavigateToAddCompoToDZModal,
        onOpenModalAddComponentsToDZ,
        onNavigateToCreateComponentStep2,
        onOpenModalAddField,
        onOpenModalCreateSchema,
        onOpenModalEditCategory,
        onOpenModalEditField,
        onOpenModalEditSchema,
        setFormModalNavigationState,
      }}
    >
      {children}
    </FormModalNavigationContext.Provider>
  );
};

FormModalNavigationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default FormModalNavigationProvider;
