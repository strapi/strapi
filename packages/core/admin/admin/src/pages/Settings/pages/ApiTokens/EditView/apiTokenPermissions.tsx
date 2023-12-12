/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

import { createContext } from '@radix-ui/react-context';

import { List as ListContentApiPermissions } from '../../../../../../../shared/contracts/content-api/permissions';
import { List as ListContentApiRoutes } from '../../../../../../../shared/contracts/content-api/routes';

export interface PseudoEvent {
  target: { value: string };
}

interface ApiTokenPermissionsContextValue {
  value: {
    selectedAction: string | null;
    routes: ListContentApiRoutes.Response['data'];
    selectedActions: string[];
    data: {
      allActionsIds: string[];
      permissions: ListContentApiPermissions.Response['data'][];
    };
    onChange: ({ target: { value } }: PseudoEvent) => void;
    onChangeSelectAll: ({
      target: { value },
    }: {
      target: { value: { action: string; actionId: string }[] };
    }) => void;
    setSelectedAction: ({ target: { value } }: PseudoEvent) => void;
  };
}

interface ApiTokenPermissionsContextProviderProps extends ApiTokenPermissionsContextValue {
  children: React.ReactNode | React.ReactNode[];
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
