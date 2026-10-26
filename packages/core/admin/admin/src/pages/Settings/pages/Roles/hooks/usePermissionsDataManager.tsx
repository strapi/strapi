// eslint-disable-next-line check-file/filename-naming-convention
import * as React from 'react';

import { createContext } from '@radix-ui/react-context';

import { Condition } from '../../../../../../../shared/contracts/permissions';
import { Permission as AuthPermission } from '../../../../../features/Auth';

import type {
  OnChangeCollectionTypeGlobalActionCheckboxAction,
  OnChangeCollectionTypeRowLeftCheckboxAction,
  OnChangeConditionsAction,
  State,
} from '../components/Permissions';

// Note: I had to guess most of these types based on the name and usage, but I actually don't
// know if they are correct, because the usage is very generic. Feel free to correct them if
// they create problems.
export interface PermissionsDataManagerContextValue extends Pick<State, 'modifiedData'> {
  availableConditions: Condition[];
  onChangeCollectionTypeLeftActionRowCheckbox: (
    pathToCollectionType: OnChangeCollectionTypeRowLeftCheckboxAction['pathToCollectionType'],
    propertyName: OnChangeCollectionTypeRowLeftCheckboxAction['propertyName'],
    rowName: OnChangeCollectionTypeRowLeftCheckboxAction['rowName'],
    value: OnChangeCollectionTypeRowLeftCheckboxAction['value']
  ) => void;
  onChangeConditions: (conditions: OnChangeConditionsAction['conditions']) => void;
  onChangeSimpleCheckbox: (event: { target: { name: string; value: boolean } }) => void;
  onChangeParentCheckbox: (event: { target: { name: string; value: boolean } }) => void;
  onChangeCollectionTypeGlobalActionCheckbox: (
    collectionTypeKind: OnChangeCollectionTypeGlobalActionCheckboxAction['collectionTypeKind'],
    actionId: OnChangeCollectionTypeGlobalActionCheckboxAction['actionId'],
    value: OnChangeCollectionTypeGlobalActionCheckboxAction['value']
  ) => void;
  userPermissions?: AuthPermission[];
  checkUserHasPermission: (action: string, subject?: string | null, field?: string) => boolean;
}

const [PermissionsDataManagerProviderRaw, usePermissionsDataManagerContext] =
  createContext<PermissionsDataManagerContextValue>('PermissionsDataManager');

export const usePermissionsDataManager = () =>
  usePermissionsDataManagerContext('usePermissionsDataManager');

interface PermissionsDataManagerProviderProps
  extends Omit<PermissionsDataManagerContextValue, 'checkUserHasPermission'> {
  children: React.ReactNode;
}

const PermissionsDataManagerProvider = ({
  children,
  userPermissions,
  availableConditions,
  modifiedData,
  onChangeConditions,
  onChangeSimpleCheckbox,
  onChangeParentCheckbox,
  onChangeCollectionTypeLeftActionRowCheckbox,
  onChangeCollectionTypeGlobalActionCheckbox,
}: PermissionsDataManagerProviderProps) => {
  const checkUserHasPermission = React.useCallback(
    (action: string, subject?: string | null, field?: string): boolean => {
      if (userPermissions === undefined) {
        return true;
      }

      const matchingPermission = userPermissions.find(
        (perm) => perm.action === action && perm.subject === subject
      );

      if (matchingPermission === undefined) {
        return false;
      }

      if (field === undefined) {
        return true;
      }

      const fields = matchingPermission.properties?.fields;

      if (fields === null || fields === undefined) {
        return true;
      }

      if (Array.isArray(fields) === false || fields.length === 0) {
        return false;
      }

      return fields.some(
        (allowedField) => allowedField === field || field.startsWith(`${allowedField}.`)
      );
    },
    [userPermissions]
  );

  return (
    <PermissionsDataManagerProviderRaw
      availableConditions={availableConditions}
      modifiedData={modifiedData}
      onChangeConditions={onChangeConditions}
      onChangeSimpleCheckbox={onChangeSimpleCheckbox}
      onChangeParentCheckbox={onChangeParentCheckbox}
      onChangeCollectionTypeLeftActionRowCheckbox={onChangeCollectionTypeLeftActionRowCheckbox}
      onChangeCollectionTypeGlobalActionCheckbox={onChangeCollectionTypeGlobalActionCheckbox}
      userPermissions={userPermissions}
      checkUserHasPermission={checkUserHasPermission}
    >
      {children}
    </PermissionsDataManagerProviderRaw>
  );
};

export { PermissionsDataManagerProvider };
