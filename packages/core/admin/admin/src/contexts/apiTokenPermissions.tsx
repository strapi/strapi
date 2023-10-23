/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

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

const ApiTokenPermissionsContext = React.createContext<ApiTokenPermissionsContextValue>({
  selectedAction: null,
  routes: [],
  selectedActions: [],
  data: {
    allActionsIds: [],
    permissions: [],
  },
  onChange: () => {},
  onChangeSelectAll: () => {},
  setSelectedAction: () => {},
});

const ApiTokenPermissionsContextProvider = ({
  children,
  ...rest
}: ApiTokenPermissionsContextProviderProps) => {
  return (
    <ApiTokenPermissionsContext.Provider value={rest}>
      {children}
    </ApiTokenPermissionsContext.Provider>
  );
};

const useApiTokenPermissionsContext = () => React.useContext(ApiTokenPermissionsContext);

export {
  ApiTokenPermissionsContext,
  ApiTokenPermissionsContextProvider,
  useApiTokenPermissionsContext,
};

export type { ApiTokenPermissionsContextValue, ApiTokenPermissionsContextProviderProps };
