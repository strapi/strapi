import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useTracking } from '@strapi/helper-plugin';
import FormModalNavigationContext from '../../contexts/FormModalNavigationContext';
import makeSearch from '../../utils/makeSearch';
import { INITIAL_STATE_DATA } from './constants';

const FormModalNavigationProvider = ({ children }) => {
  const [state, setFormModalNavigationState] = useState(INITIAL_STATE_DATA);
  const { trackUsage } = useTracking();
  // FIXME
  const { push } = useHistory();

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

    const search = {
      modalType: 'attribute',
      forTarget: state.forTarget,
      targetUid: state.targetUid,
      attributeType,
      settingType: 'base',
      step,
      actionType: 'create',
    };

    push({ search: makeSearch(search) });
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
      };
    });

    const search = {
      modalType: 'addComponentToDynamicZone',
      forTarget: 'contentType',
      targetUid,
      dynamicZoneTarget,
      settingType: 'base',
      step: '1',
      actionType: 'edit',
    };

    push({ search: makeSearch(search) });
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

    // FIXME
    const nextSearch = {
      modalType: 'chooseAttribute',
      forTarget,
      targetUid,
      actionType: 'create',
    };

    push({ search: makeSearch(nextSearch) });
  };

  const onOpenModalCreateSchema = nextState => {
    setFormModalNavigationState(prevState => {
      return { ...prevState, ...nextState, isOpen: true };
    });

    push({ search: makeSearch(nextState) });
  };

  const onOpenModalEditCategory = categoryName => {
    setFormModalNavigationState(prevState => {
      return {
        ...prevState,
        categoryName,
        isOpen: true,
      };
    });

    const nextSearch = {
      actionType: 'edit',
      modalType: 'editCategory',
      categoryName,
      settingType: 'base',
    };

    push({ search: makeSearch(nextSearch) });
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

    const nextSearch = {
      modalType: 'attribute',
      actionType: 'edit',
      settingType: 'base',
      forTarget,
      targetUid,
      attributeName,
      attributeType,
      step,
    };

    push({ search: makeSearch(nextSearch) });
  };

  const onOpenModalEditSchema = ({ modalType, forTarget, targetUid }) => {
    setFormModalNavigationState(prevState => {
      return {
        ...prevState,
        modalType,
        actionType: 'edit',
        settingType: 'base',
        forTarget,
        targetUid,
        isOpen: true,
      };
    });

    const nextSearch = {
      modalType,
      actionType: 'edit',
      settingType: 'base',
      forTarget,
      targetUid,
    };

    push({ search: makeSearch(nextSearch) });
  };

  const onCloseModal = () => {
    setFormModalNavigationState(INITIAL_STATE_DATA);

    push({ search: '' });
  };

  return (
    <FormModalNavigationContext.Provider
      value={{
        ...state,
        onClickSelectField,
        onCloseModal,
        onOpenModalAddComponentsToDZ,
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
