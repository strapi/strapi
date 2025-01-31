import * as React from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';

import { FormModalNavigationContext } from './FormModalNavigationContext';

import type { SchemaType } from '../../types';
import type { Internal } from '@strapi/types';

type FormModalNavigationProviderProps = {
  children: React.ReactNode;
};

export type Tab = 'basic' | 'advanced';

export type ModalType =
  | 'chooseAttribute'
  | 'edit'
  | 'attribute'
  | 'customField'
  | 'addComponentToDynamicZone'
  | 'contentType'
  | 'component';

export type State = Record<string, any>;

const INITIAL_STATE_DATA: State = {
  actionType: null,
  attributeName: null,
  attributeType: null,
  dynamicZoneTarget: null,
  forTarget: null,
  modalType: null,
  isOpen: true,
  showBackLink: false,
  kind: null,
  step: null,
  targetUid: null,
  customFieldUid: null,
  activeTab: 'basic',
};

export type SelectCustomFieldPayload = {
  attributeType: string;
  customFieldUid: string;
};

export type SelectFieldPayload = {
  attributeType: string;
  step: string | null;
};

export type OpenModalAddComponentsToDZPayload = {
  dynamicZoneTarget?: string;
  targetUid: Internal.UID.Schema;
};

export type OpenModalAddFieldPayload = {
  forTarget: SchemaType;
  targetUid?: Internal.UID.Schema;
};

export type OpenModalEditCustomFieldPayload = {
  forTarget: SchemaType;
  targetUid: Internal.UID.Schema;
  attributeName: string;
  attributeType: string;
  customFieldUid: string;
};

export type OpenModalEditFieldPayload = {
  forTarget: SchemaType;
  targetUid: Internal.UID.Schema;
  attributeName: string;
  attributeType: string;
  step: string | null;
};

export type OpenModalEditSchemaPayload = {
  modalType: ModalType;
  forTarget: SchemaType;
  targetUid: Internal.UID.Schema;
  kind: string;
};

export type NavigateToChooseAttributeModalPayload = {
  forTarget: SchemaType;
  targetUid: Internal.UID.Schema;
};

export type NavigateToAddCompoToDZModalPayload = {
  dynamicZoneTarget: string;
};

export const FormModalNavigationProvider = ({ children }: FormModalNavigationProviderProps) => {
  const [state, setFormModalNavigationState] = React.useState(INITIAL_STATE_DATA);
  const { trackUsage } = useTracking();

  const onClickSelectCustomField = ({
    attributeType,
    customFieldUid,
  }: SelectCustomFieldPayload) => {
    // TODO: Add tracking for custom fields
    setFormModalNavigationState((prevState: State) => {
      return {
        ...prevState,
        actionType: 'create',
        modalType: 'customField',
        attributeType,
        customFieldUid,
        activeTab: 'basic',
      };
    });
  };

  const onClickSelectField = ({ attributeType, step }: SelectFieldPayload) => {
    if (state.forTarget === 'contentType') {
      trackUsage('didSelectContentTypeFieldType', { type: attributeType });
    }

    setFormModalNavigationState((prevState: State) => {
      return {
        ...prevState,
        actionType: 'create',
        modalType: 'attribute',
        step,
        attributeType,
        showBackLink: true,
        activeTab: 'basic',
      };
    });
  };

  const onOpenModalAddComponentsToDZ = ({
    dynamicZoneTarget,
    targetUid,
  }: OpenModalAddComponentsToDZPayload) => {
    setFormModalNavigationState((prevState: State) => {
      return {
        ...prevState,
        dynamicZoneTarget,
        targetUid,
        modalType: 'addComponentToDynamicZone',
        forTarget: 'contentType',
        step: '1',
        actionType: 'edit',
        isOpen: true,
      };
    });
  };

  const onOpenModalAddField = ({ forTarget, targetUid }: OpenModalAddFieldPayload) => {
    setFormModalNavigationState((prevState: State) => {
      return {
        ...prevState,
        actionType: 'create',
        forTarget,
        targetUid,
        modalType: 'chooseAttribute',
        isOpen: true,
        showBackLink: false,
        activeTab: 'basic',
      };
    });
  };

  const onOpenModalCreateSchema = (nextState: State) => {
    setFormModalNavigationState((prevState) => {
      return { ...prevState, ...nextState, isOpen: true, activeTab: 'basic' };
    });
  };

  const onOpenModalEditCustomField = ({
    forTarget,
    targetUid,
    attributeName,
    attributeType,
    customFieldUid,
  }: OpenModalEditCustomFieldPayload) => {
    setFormModalNavigationState((prevState: State) => {
      return {
        ...prevState,
        modalType: 'customField',
        customFieldUid,
        actionType: 'edit',
        forTarget,
        targetUid,
        attributeName,
        attributeType,
        isOpen: true,
        activeTab: 'basic',
      };
    });
  };

  const onOpenModalEditField = ({
    forTarget,
    targetUid,
    attributeName,
    attributeType,
    step,
  }: OpenModalEditFieldPayload) => {
    setFormModalNavigationState((prevState: State) => {
      return {
        ...prevState,
        modalType: 'attribute',
        actionType: 'edit',
        forTarget,
        targetUid,
        attributeName,
        attributeType,
        step,
        isOpen: true,
      };
    });
  };

  const onOpenModalEditSchema = ({
    modalType,
    forTarget,
    targetUid,
    kind,
  }: OpenModalEditSchemaPayload) => {
    setFormModalNavigationState((prevState: State) => {
      return {
        ...prevState,
        modalType,
        actionType: 'edit',
        forTarget,
        targetUid,
        kind,
        isOpen: true,
        activeTab: 'basic',
      };
    });
  };

  const onCloseModal = () => {
    setFormModalNavigationState(INITIAL_STATE_DATA);
  };

  const onNavigateToChooseAttributeModal = ({
    forTarget,
    targetUid,
  }: NavigateToChooseAttributeModalPayload) => {
    setFormModalNavigationState((prev: State) => {
      return {
        ...prev,
        forTarget,
        targetUid,
        modalType: 'chooseAttribute',
        activeTab: 'basic',
      };
    });
  };

  const onNavigateToCreateComponentStep2 = () => {
    setFormModalNavigationState((prev: State) => {
      return {
        ...prev,
        attributeType: 'component',
        modalType: 'attribute',
        step: '2',
        activeTab: 'basic',
      };
    });
  };

  const onNavigateToAddCompoToDZModal = ({
    dynamicZoneTarget,
  }: NavigateToAddCompoToDZModalPayload) => {
    setFormModalNavigationState((prev: State) => {
      return {
        ...prev,
        dynamicZoneTarget,
        modalType: 'addComponentToDynamicZone',
        actionType: 'create',
        step: '1',
        attributeType: null,
        attributeName: null,
        activeTab: 'basic',
      };
    });
  };

  const setActiveTab = (value: Tab) => {
    setFormModalNavigationState((prev: State) => {
      return {
        ...prev,
        activeTab: value,
      };
    });
  };

  return (
    <FormModalNavigationContext.Provider
      value={{
        ...state,
        onClickSelectField,
        onClickSelectCustomField,
        onCloseModal,
        onNavigateToChooseAttributeModal,
        onNavigateToAddCompoToDZModal,
        onOpenModalAddComponentsToDZ,
        onNavigateToCreateComponentStep2,
        onOpenModalAddField,
        onOpenModalCreateSchema,
        onOpenModalEditField,
        onOpenModalEditCustomField,
        onOpenModalEditSchema,
        setFormModalNavigationState,
        setActiveTab,
      }}
    >
      {children}
    </FormModalNavigationContext.Provider>
  );
};
