/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import type {
  State,
  SelectFieldPayload,
  SelectCustomFieldPayload,
  NavigateToChooseAttributeModalPayload,
  NavigateToAddCompoToDZModalPayload,
  OpenModalAddComponentsToDZPayload,
  OpenModalEditFieldPayload,
  OpenModalEditCustomFieldPayload,
  OpenModalEditSchemaPayload,
  OpenModalAddFieldPayload,
} from './FormModalNavigationProvider';

export type FormModalNavigationContextValue = State & {
  onCloseModal: () => void;
  onOpenModalAddField: (options: OpenModalAddFieldPayload) => void;
  onClickSelectField: (option: SelectFieldPayload) => void;
  onClickSelectCustomField: (option: SelectCustomFieldPayload) => void;
  onNavigateToChooseAttributeModal: (options: NavigateToChooseAttributeModalPayload) => void;
  onNavigateToAddCompoToDZModal: (options: NavigateToAddCompoToDZModalPayload) => void;
  onOpenModalAddComponentsToDZ: (options: OpenModalAddComponentsToDZPayload) => void;
  onNavigateToCreateComponentStep2: () => void;
  onOpenModalCreateSchema: (options: State) => void;
  onOpenModalEditField: (options: OpenModalEditFieldPayload) => void;
  onOpenModalEditCustomField: (options: OpenModalEditCustomFieldPayload) => void;
  onOpenModalEditSchema: (options: OpenModalEditSchemaPayload) => void;
  setFormModalNavigationState: (value: React.SetStateAction<State>) => void;
  setActiveTab: (value: State['activeTab']) => void;
};

// @ts-expect-error need to pass initial value to params
export const FormModalNavigationContext = React.createContext<FormModalNavigationContextValue>();
