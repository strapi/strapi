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
      // If userPermissions is undefined, allow all (backward compatibility for role editing)
      if (userPermissions === undefined) {
        return true;
      }

      // Find matching permission (action + subject)
      const matchingPermission = userPermissions.find(
        (perm) => perm.action === action && perm.subject === subject
      );

      // If no matching permission found, deny access
      if (matchingPermission === undefined) {
        return false;
      }

      // If no field specified, check is complete (action + subject match)
      if (field === undefined) {
        return true;
      }

      // Field-level checking
      const fields = matchingPermission.properties?.fields;

      // If fields is null/undefined, user has access to all fields
      if (fields === null || fields === undefined) {
        return true;
      }

      // If fields is empty array, user has no field access
      if (Array.isArray(fields) === false || fields.length === 0) {
        return false;
      }

      // Check if field is in the allowed fields list
      // Support both exact match and parent path match
      // Example: if user has "cover", they can access "cover" and "cover.image"
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
