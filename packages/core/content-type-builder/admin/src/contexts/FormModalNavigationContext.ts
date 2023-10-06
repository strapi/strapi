/* eslint-disable check-file/filename-naming-convention */
import { createContext } from 'react';

import type { SchemaType } from '../types';
import type { UID } from '@strapi/types';

interface FormModalNavigationContextValue {
  onCloseModal: () => void;
  onOpenModalAddField: (options: { forTarget: SchemaType; targetUid?: UID.Any }) => void;
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const FormModalNavigationContext = createContext<FormModalNavigationContextValue>();
