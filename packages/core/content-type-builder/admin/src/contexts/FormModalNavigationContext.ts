/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { INITIAL_STATE_DATA } from '../components/FormModalNavigationProvider/constants';

import type {
  ModalEventProps,
  State,
} from '../components/FormModalNavigationProvider/FormModalNavigationProvider';
import type { SchemaType } from '../types';
import type { UID } from '@strapi/types';

interface FormModalNavigationContextValue {
  onCloseModal: () => void;
  onOpenModalAddField: (options: { forTarget: SchemaType; targetUid?: UID.Any }) => void;
  onClickSelectField: (option: ModalEventProps) => void;
  onClickSelectCustomField: (option: ModalEventProps) => void;
  onNavigateToChooseAttributeModal: (options: ModalEventProps) => void;
  onNavigateToAddCompoToDZModal: (options: ModalEventProps) => void;
  onOpenModalAddComponentsToDZ: (options: ModalEventProps) => void;
  onNavigateToCreateComponentStep2: () => void;
  onOpenModalCreateSchema: (options: State) => void;
  onOpenModalEditCategory: (categoryName: string) => void;
  onOpenModalEditField: (options: ModalEventProps) => void;
  onOpenModalEditCustomField: (options: ModalEventProps) => void;
  onOpenModalEditSchema: (options: ModalEventProps) => void;
  setFormModalNavigationState: (value: React.SetStateAction<typeof INITIAL_STATE_DATA>) => void;
  actionType: string;
  attributeName: string;
  attributeType: string;
  customFieldUid: string;
  categoryName: string;
  dynamicZoneTarget: string;
  forTarget: SchemaType;
  modalType: string;
  isOpen: string;
  showBackLink: string;
  kind: string;
  step: string;
  targetUid: UID.Any;
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const FormModalNavigationContext = React.createContext<FormModalNavigationContextValue>();
