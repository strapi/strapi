import * as React from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';

import { FormModalNavigationContext } from '../../contexts/FormModalNavigationContext';

import { INITIAL_STATE_DATA } from './constants';

type FormModalNavigationProviderProps = {
  children: React.ReactNode;
};

export type State = any;

export type ModalEventProps = {
  attributeType?: string;
  customFieldUid?: string;
  dynamicZoneTarget?: string;
  forTarget?: string;
  targetUid?: string;
  attributeName?: string;
  step?: string | null;
  kind?: string;
  categoryName?: string;
  modalType?: string;
  actionType?: string;
  isOpen?: boolean;
  showBackLink?: boolean;
};

export const FormModalNavigationProvider = ({ children }: FormModalNavigationProviderProps) => {
  const [state, setFormModalNavigationState] = React.useState(INITIAL_STATE_DATA);
  const { trackUsage } = useTracking();

  const onClickSelectCustomField = ({ attributeType, customFieldUid }: ModalEventProps) => {
    // TODO: Add tracking for custom fields
    setFormModalNavigationState((prevState: any) => {
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

  const onClickSelectField = ({ attributeType, step }: ModalEventProps) => {
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

  const onOpenModalAddComponentsToDZ = ({ dynamicZoneTarget, targetUid }: ModalEventProps) => {
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

  const onOpenModalAddField = ({ forTarget, targetUid }: ModalEventProps) => {
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

  const onOpenModalEditCategory = (categoryName: string) => {
    setFormModalNavigationState((prevState: State) => {
      return {
        ...prevState,
        categoryName,
        actionType: 'edit',
        modalType: 'editCategory',
        isOpen: true,
        activeTab: 'basic',
      };
    });
  };

  const onOpenModalEditCustomField = ({
    forTarget,
    targetUid,
    attributeName,
    attributeType,
    customFieldUid,
  }: ModalEventProps) => {
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
  }: ModalEventProps) => {
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

  const onOpenModalEditSchema = ({ modalType, forTarget, targetUid, kind }: ModalEventProps) => {
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

  const onNavigateToChooseAttributeModal = ({ forTarget, targetUid }: ModalEventProps) => {
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

  const onNavigateToAddCompoToDZModal = ({ dynamicZoneTarget }: ModalEventProps) => {
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

  const setActiveTab = (value: string) => {
    setFormModalNavigationState((prev: State) => {
      return {
        ...prev,
        activeTab: value,
      };
    });
  };

  return (
    <FormModalNavigationContext.Provider
      value={
        {
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
          onOpenModalEditCategory,
          onOpenModalEditField,
          onOpenModalEditCustomField,
          onOpenModalEditSchema,
          setFormModalNavigationState,
          setActiveTab,
        } as any
      }
    >
      {children}
    </FormModalNavigationContext.Provider>
  );
};
