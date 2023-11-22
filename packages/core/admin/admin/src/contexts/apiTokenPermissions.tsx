/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

import { createContext } from '@radix-ui/react-context';
import { Entity } from '@strapi/types';

interface PseudoEvent {
  target: { value: string };
}

interface ApiTokenPermissionsContextValue {
  selectedAction: string[] | null;
  routes: string[];
  selectedActions: string[];
  data: {
    allActionsIds: Entity.ID[];
    permissions: {
      apiId: string;
      label: string;
      controllers: { controller: string; actions: { actionId: string; action: string } }[];
    }[];
  };
  onChange: ({ target: { value } }: PseudoEvent) => void;
  onChangeSelectAll: ({ target: { value } }: PseudoEvent) => void;
  setSelectedAction: ({ target: { value } }: PseudoEvent) => void;
}

interface ApiTokenPermissionsContextProviderProps extends ApiTokenPermissionsContextValue {
  children: React.ReactNode[];
}

const [ApiTokenPermissionsContextProvider, useApiTokenPermissionsContext] =
  createContext<ApiTokenPermissionsContextValue>('ApiTokenPermissionsContext');

const ApiTokenPermissionsProvider = ({
  children,
  ...rest
}: ApiTokenPermissionsContextProviderProps) => {
  return (
    <ApiTokenPermissionsContextProvider {...rest}>{children}</ApiTokenPermissionsContextProvider>
  );
};

const useApiTokenPermissions = () => useApiTokenPermissionsContext('useApiTokenPermissions');

export { ApiTokenPermissionsProvider, useApiTokenPermissions };
export type { ApiTokenPermissionsContextValue, ApiTokenPermissionsContextProviderProps };
