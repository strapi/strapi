// eslint-disable-next-line check-file/filename-naming-convention
import * as React from 'react';

import { createContext } from '@radix-ui/react-context';

import { Condition } from '../../../../../../../shared/contracts/permissions';
import { Permission as AuthPermission } from '../../../../../features/Auth';
import { isPermissionHeld } from '../utils/createPermissionChecker';

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
   * Whether the user holds `action` on `subject` and, when given, the `value` of `property`
   * (`fields` by default, e.g. a field path, or `locales` with a locale code).
   */
  checkUserHasPermission: (
    action: string,
    subject?: string | null,
    value?: string,
    property?: string
  ) => boolean;
  /**
   * The conditions the user may set on `action` / `subject`, or `undefined` when they are not
   * restricted. See {@link getAllowedConditions}.
   */
  getAllowedConditions: (action: string, subject: string | null) => string[] | undefined;
}

/**
 * Conditions are OR-ed by the permission engine, so the server only lets a user grant a
 * permission with conditions no broader than their own: anything goes if one of their matching
 * permissions has no conditions, otherwise a non-empty subset of the union of their conditions.
 *
 * Returns `undefined` when the user is not restricted (super admin, or holds the permission
 * without conditions), otherwise the union of the user's conditions for that action and subject.
 */
export const getAllowedConditions = (
  userPermissions: AuthPermission[] | undefined,
  action: string,
  subject: string | null
): string[] | undefined => {
  if (userPermissions === undefined) {
    return undefined;
  }

  const matchingPermissions = userPermissions.filter((perm) => {
    const fields = perm.properties?.fields;

    // A permission with no fields grants nothing (the permission engine drops it)
    return (
      perm.action === action &&
      (perm.subject ?? null) === subject &&
      !(Array.isArray(fields) && fields.length === 0)
    );
  });

  if (matchingPermissions.some((perm) => !perm.conditions || perm.conditions.length === 0)) {
    return undefined;
  }

  return [...new Set(matchingPermissions.flatMap((perm) => perm.conditions ?? []))];
};

const [PermissionsDataManagerProviderRaw, usePermissionsDataManagerContext] =
  createContext<PermissionsDataManagerContextValue>('PermissionsDataManager');

export const usePermissionsDataManager = () =>
  usePermissionsDataManagerContext('usePermissionsDataManager');

interface PermissionsDataManagerProviderProps
  extends Omit<
    PermissionsDataManagerContextValue,
    'checkUserHasPermission' | 'getAllowedConditions'
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
    (action: string, subject?: string | null, value?: string, property = 'fields'): boolean =>
      userPermissions === undefined ||
      isPermissionHeld(userPermissions, action, subject, property, value),
    [userPermissions]
  );

  const getAllowedConditionsForUser = React.useCallback(
    (action: string, subject: string | null) =>
      getAllowedConditions(userPermissions, action, subject),
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
      inheritConditions={inheritConditions}
      checkUserHasPermission={checkUserHasPermission}
      getAllowedConditions={getAllowedConditionsForUser}
    >
      {children}
    </PermissionsDataManagerProviderRaw>
  );
};

export { PermissionsDataManagerProvider };
