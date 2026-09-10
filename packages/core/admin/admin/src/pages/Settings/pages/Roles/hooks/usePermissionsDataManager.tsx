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

/**
 * How the editor treats conditions when a ceiling (`userPermissions`) is set:
 *  - `inherit`: conditions are copied from the ceiling and read-only (admin API tokens:
 *    a token can never carry conditions its owner does not have);
 *  - `bounded`: conditions are editable, except where the ceiling permission is itself
 *    conditional — then they are locked to the ceiling's conditions (roles: an admin
 *    cannot grant more than they hold, and conditions widen access when added, since
 *    the engine ORs them).
 */
export type ConditionsPolicy = 'inherit' | 'bounded';

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
  conditionsPolicy: ConditionsPolicy;
  checkUserHasPermission: (
    action: string,
    subject?: string | null,
    field?: string,
    locale?: string
  ) => boolean;
  /**
   * The conditions the ceiling imposes on an action: `null` when there is no ceiling or
   * the matching ceiling permission is unconditional (anything goes), otherwise the
   * union of the matching ceiling permissions' conditions (the only ones grantable).
   */
  getConditionsCeiling: (action: string, subject?: string | null) => string[] | null;
}

const [PermissionsDataManagerProviderRaw, usePermissionsDataManagerContext] =
  createContext<PermissionsDataManagerContextValue>('PermissionsDataManager');

export const usePermissionsDataManager = () =>
  usePermissionsDataManagerContext('usePermissionsDataManager');

interface PermissionsDataManagerProviderProps
  extends Omit<
    PermissionsDataManagerContextValue,
    'checkUserHasPermission' | 'getConditionsCeiling' | 'conditionsPolicy'
  > {
  children: React.ReactNode;
  conditionsPolicy?: ConditionsPolicy;
}

const PermissionsDataManagerProvider = ({
  children,
  userPermissions,
  conditionsPolicy = 'inherit',
  availableConditions,
  modifiedData,
  onChangeConditions,
  onChangeSimpleCheckbox,
  onChangeParentCheckbox,
  onChangeCollectionTypeLeftActionRowCheckbox,
  onChangeCollectionTypeGlobalActionCheckbox,
}: PermissionsDataManagerProviderProps) => {
  const checkUserHasPermission = React.useCallback(
    (action: string, subject?: string | null, field?: string, locale?: string): boolean => {
      if (userPermissions === undefined) {
        return true;
      }

      const matchingPermissions = userPermissions.filter(
        (perm) => perm.action === action && (perm.subject ?? null) === (subject ?? null)
      );

      if (matchingPermissions.length === 0) {
        return false;
      }

      if (field !== undefined) {
        const fieldAllowed = matchingPermissions.some((perm) => {
          const fields = perm.properties?.fields;

          if (fields === null || fields === undefined) {
            return true;
          }

          if (Array.isArray(fields) === false || fields.length === 0) {
            return false;
          }

          return fields.some(
            (allowedField) => allowedField === field || field.startsWith(`${allowedField}.`)
          );
        });

        if (!fieldAllowed) {
          return false;
        }
      }

      if (locale !== undefined) {
        const localeAllowed = matchingPermissions.some((perm) => {
          const locales = perm.properties?.locales;

          if (locales === null || locales === undefined) {
            return true;
          }

          return Array.isArray(locales) && locales.includes(locale);
        });

        if (!localeAllowed) {
          return false;
        }
      }

      return true;
    },
    [userPermissions]
  );

  const getConditionsCeiling = React.useCallback(
    (action: string, subject?: string | null): string[] | null => {
      if (userPermissions === undefined) {
        return null;
      }

      const matchingPermissions = userPermissions.filter(
        (perm) => perm.action === action && (perm.subject ?? null) === (subject ?? null)
      );

      if (matchingPermissions.length === 0) {
        return null;
      }

      if (matchingPermissions.some((perm) => !perm.conditions || perm.conditions.length === 0)) {
        return null;
      }

      return Array.from(new Set(matchingPermissions.flatMap((perm) => perm.conditions ?? [])));
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
      conditionsPolicy={conditionsPolicy}
      checkUserHasPermission={checkUserHasPermission}
      getConditionsCeiling={getConditionsCeiling}
    >
      {children}
    </PermissionsDataManagerProviderRaw>
  );
};

export { PermissionsDataManagerProvider };
