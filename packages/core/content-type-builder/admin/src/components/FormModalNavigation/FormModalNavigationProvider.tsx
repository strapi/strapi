import { useCallback, useMemo, useState } from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';

import { useCTBSession } from '../CTBSession/useCTBSession';

import { FormModalNavigationContext } from './FormModalNavigationContext';

import type { TrackingEvent } from '@strapi/admin/strapi-admin';
import type { Internal, Struct } from '@strapi/types';

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

export const INITIAL_STATE_DATA: State = {
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
  forTarget: Struct.ModelType;
  targetUid?: Internal.UID.Schema;
};

export type OpenModalEditCustomFieldPayload = {
  forTarget: Struct.ModelType;
  targetUid: Internal.UID.Schema;
  attributeName: string;
  attributeType: string;
  customFieldUid: string;
};

export type OpenModalEditFieldPayload = {
  forTarget: Struct.ModelType;
  targetUid: Internal.UID.Schema;
  attributeName: string;
  attributeType: string;
  step: string | null;
};

export type OpenModalEditSchemaPayload = {
  modalType: ModalType;
  forTarget: Struct.ModelType;
  targetUid: Internal.UID.Schema;
  kind?: string;
};

export type NavigateToChooseAttributeModalPayload = {
  forTarget: Struct.ModelType;
  targetUid: Internal.UID.Schema;
};

export type NavigateToAddCompoToDZModalPayload = {
  dynamicZoneTarget: string;
};

export const FormModalNavigationProvider = ({ children }: FormModalNavigationProviderProps) => {
  const [state, setFormModalNavigationState] = useState(INITIAL_STATE_DATA);
  const { trackUsage: originalTrackUsage } = useTracking();
  const { sessionId } = useCTBSession();

  // Create a trackUsage that includes session ID from CTBSessionContext
  const trackUsage = useCallback(
    <TEvent extends TrackingEvent>(event: TEvent['name'], properties?: TEvent['properties']) => {
      const propertiesWithSessionId = {
        ...(properties as Record<string, unknown>),
        ctbSessionId: sessionId,
      };
      return originalTrackUsage(event, propertiesWithSessionId as TEvent['properties']);
    },
    [originalTrackUsage, sessionId]
  );

  const onClickSelectCustomField = useCallback(
    ({ attributeType, customFieldUid }: SelectCustomFieldPayload) => {
      setFormModalNavigationState((prevState: State) => ({
        ...prevState,
        actionType: 'create',
        modalType: 'customField',
        attributeType,
        customFieldUid,
        activeTab: 'basic',
      }));
    },
    []
  );

  const onClickSelectField = useCallback(
    ({ attributeType, step }: SelectFieldPayload) => {
      if (state.forTarget === 'contentType') {
        trackUsage('didSelectContentTypeFieldType', { type: attributeType });
      }

      setFormModalNavigationState((prevState: State) => ({
        ...prevState,
        actionType: 'create',
        modalType: 'attribute',
        step,
        attributeType,
        showBackLink: true,
        activeTab: 'basic',
      }));
    },
    [state.forTarget, trackUsage]
  );

  const onOpenModalAddComponentsToDZ = useCallback(
    ({ dynamicZoneTarget, targetUid }: OpenModalAddComponentsToDZPayload) => {
      setFormModalNavigationState((prevState: State) => ({
        ...prevState,
        dynamicZoneTarget,
        targetUid,
        modalType: 'addComponentToDynamicZone',
        forTarget: 'contentType',
        step: '1',
        actionType: 'edit',
        isOpen: true,
      }));
    },
    []
  );

  const onOpenModalAddField = useCallback(({ forTarget, targetUid }: OpenModalAddFieldPayload) => {
    setFormModalNavigationState((prevState: State) => ({
      ...prevState,
      actionType: 'create',
      forTarget,
      targetUid,
      modalType: 'chooseAttribute',
      isOpen: true,
      showBackLink: false,
      activeTab: 'basic',
    }));
  }, []);

  const onOpenModalCreateSchema = useCallback((nextState: State) => {
    setFormModalNavigationState((prevState) => ({
      ...prevState,
      ...nextState,
      isOpen: true,
      activeTab: 'basic',
    }));
  }, []);

  const onOpenModalEditCustomField = useCallback(
    ({
      forTarget,
      targetUid,
      attributeName,
      attributeType,
      customFieldUid,
    }: OpenModalEditCustomFieldPayload) => {
      setFormModalNavigationState((prevState: State) => ({
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
      }));
    },
    []
  );

  const onOpenModalEditField = useCallback(
    ({ forTarget, targetUid, attributeName, attributeType, step }: OpenModalEditFieldPayload) => {
      setFormModalNavigationState((prevState: State) => ({
        ...prevState,
        modalType: 'attribute',
        actionType: 'edit',
        forTarget,
        targetUid,
        attributeName,
        attributeType,
        step,
        isOpen: true,
      }));
    },
    []
  );

  const onOpenModalEditSchema = useCallback(
    ({ modalType, forTarget, targetUid, kind }: OpenModalEditSchemaPayload) => {
      setFormModalNavigationState((prevState: State) => ({
        ...prevState,
        modalType,
        actionType: 'edit',
        forTarget,
        targetUid,
        kind,
        isOpen: true,
        activeTab: 'basic',
      }));
    },
    []
  );

  const onCloseModal = useCallback(() => {
    setFormModalNavigationState(INITIAL_STATE_DATA);
  }, []);

  const onNavigateToChooseAttributeModal = useCallback(
    ({ forTarget, targetUid }: NavigateToChooseAttributeModalPayload) => {
      setFormModalNavigationState((prev: State) => ({
        ...prev,
        forTarget,
        targetUid,
        modalType: 'chooseAttribute',
        activeTab: 'basic',
      }));
    },
    []
  );

  const onNavigateToCreateComponentStep2 = useCallback(() => {
    setFormModalNavigationState((prev: State) => ({
      ...prev,
      attributeType: 'component',
      modalType: 'attribute',
      step: '2',
      activeTab: 'basic',
    }));
  }, []);

  const onNavigateToAddCompoToDZModal = useCallback(
    ({ dynamicZoneTarget }: NavigateToAddCompoToDZModalPayload) => {
      setFormModalNavigationState((prev: State) => ({
        ...prev,
        dynamicZoneTarget,
        modalType: 'addComponentToDynamicZone',
        actionType: 'create',
        step: '1',
        attributeType: null,
        attributeName: null,
        activeTab: 'basic',
      }));
    },
    []
  );

  const setActiveTab = useCallback((value: Tab) => {
    setFormModalNavigationState((prev: State) => ({
      ...prev,
      activeTab: value,
    }));
  }, []);

  const contextValue = useMemo(
    () => ({
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
    }),
    [
      state,
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
      setActiveTab,
    ]
  );

  return (
    <FormModalNavigationContext.Provider value={contextValue}>
      {children}
    </FormModalNavigationContext.Provider>
  );
};
