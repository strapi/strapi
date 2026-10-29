// eslint-disable-next-line check-file/filename-naming-convention
import * as React from 'react';

import { createContext } from '@radix-ui/react-context';
import get from 'lodash/get';

import { Condition } from '../../../../../../../shared/contracts/permissions';
import { Permission as AuthPermission } from '../../../../../features/Auth';
import {
  canTick,
  findActionForm,
  getActionSelection,
  getAllowedConditions,
  isPermissionHeld,
  isValueSelected,
  listGroupLeaves,
} from '../utils/createPermissionChecker';

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
  /**
   * Whether conditions are inherited from `userPermissions` and read-only (admin tokens),
   * as opposed to only using `userPermissions` to gate which checkboxes can be ticked (roles).
   */
  inheritConditions: boolean;
  /**
   * Whether the user may tick `action` on `subject` and, when given, the `value` of `property`
   * (`fields` by default, e.g. a field path, or `locales` with a locale code) next to what is
   * already ticked for that action. A ticked value stays enabled so it can be unticked.
   */
  checkUserHasPermission: (
    action: string,
    subject?: string | null,
    value?: string,
    property?: string
  ) => boolean;
  /**
   * Whether the user may use the checkbox of a component or nested group (`groupPath`, e.g.
   * `seo` or `seo.media`): when {@link checkUserHasPermission} allows at least one field under
   * it. A role saved in the UI holds the fields of a component, not the component path.
   */
  checkUserHasGroupPermission: (
    action: string,
    subject: string | null | undefined,
    groupPath: string,
    property?: string
  ) => boolean;
  /**
   * The conditions the user may set on `action` / `subject` given what is ticked, or
   * `undefined` when they are not restricted. See `getAllowedConditions` in
   * `utils/createPermissionChecker.ts`.
   */
  getAllowedConditions: (action: string, subject: string | null) => string[] | undefined;
}

const [PermissionsDataManagerProviderRaw, usePermissionsDataManagerContext] =
  createContext<PermissionsDataManagerContextValue>('PermissionsDataManager');

export const usePermissionsDataManager = () =>
  usePermissionsDataManagerContext('usePermissionsDataManager');

interface PermissionsDataManagerProviderProps extends Omit<
  PermissionsDataManagerContextValue,
  'checkUserHasPermission' | 'checkUserHasGroupPermission' | 'getAllowedConditions'
> {
  children: React.ReactNode;
}

const PermissionsDataManagerProvider = ({
  children,
  userPermissions,
  inheritConditions,
  availableConditions,
  modifiedData,
  onChangeConditions,
  onChangeSimpleCheckbox,
  onChangeParentCheckbox,
  onChangeCollectionTypeLeftActionRowCheckbox,
  onChangeCollectionTypeGlobalActionCheckbox,
}: PermissionsDataManagerProviderProps) => {
  const checkUserHasPermission = React.useCallback(
    (action: string, subject?: string | null, value?: string, property = 'fields'): boolean => {
      if (userPermissions === undefined) {
        return true;
      }

      if (value === undefined || value === '') {
        return isPermissionHeld(userPermissions, action, subject);
      }

      const selection = getActionSelection(findActionForm(modifiedData, subject, action));

      if (isValueSelected(selection, property, value)) {
        return isPermissionHeld(userPermissions, action, subject, property, value);
      }

      return canTick(userPermissions, action, subject, selection, property, value);
    },
    [userPermissions, modifiedData]
  );

  const checkUserHasGroupPermission = React.useCallback(
    (
      action: string,
      subject: string | null | undefined,
      groupPath: string,
      property = 'fields'
    ): boolean => {
      if (userPermissions === undefined) {
        return true;
      }

      const group = get(findActionForm(modifiedData, subject, action), [
        'properties',
        property,
        ...groupPath.split('.'),
      ]);
      const leaves = listGroupLeaves(group);

      if (leaves.length === 0) {
        return checkUserHasPermission(action, subject, groupPath, property);
      }

      return leaves.some((leaf) =>
        checkUserHasPermission(action, subject, `${groupPath}.${leaf}`, property)
      );
    },
    [userPermissions, modifiedData, checkUserHasPermission]
  );

  const getAllowedConditionsForUser = React.useCallback(
    (action: string, subject: string | null) =>
      getAllowedConditions(
        userPermissions,
        action,
        subject,
        getActionSelection(findActionForm(modifiedData, subject, action))
      ),
    [userPermissions, modifiedData]
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
      inheritConditions={inheritConditions}
      checkUserHasPermission={checkUserHasPermission}
      checkUserHasGroupPermission={checkUserHasGroupPermission}
      getAllowedConditions={getAllowedConditionsForUser}
    >
      {children}
    </PermissionsDataManagerProviderRaw>
  );
};

export { PermissionsDataManagerProvider };
