import * as React from 'react';

// Note: I had to guess most of these types based on the name and usage, but I actually don't
// know if they are correct, because the usage is very generic. Feel free to correct them if
// they create problems.
export interface PermissionsDataManagerContextValue {
  availableConditions: unknown[];
  modifiedData: object;
  onChangeCollectionTypeLeftActionRowCheckbox: (
    pathToData: string,
    propertyName: string,
    nam: string,
    value: unknown
  ) => void;
  onChangeConditions: (conditions: object) => void;
  onChangeSimpleCheckbox: (target: { name: string; value: unknown }) => void;
  onChangeParentCheckbox: (target: { name: string; value: unknown }) => void;
  onChangeCollectionTypeGlobalActionCheckbox: (
    kind: string,
    actionId: string,
    value: unknown
  ) => void;
}

export const PermissionsDataManagerContext =
  React.createContext<PermissionsDataManagerContextValue | null>(null);

export const usePermissionsDataManager = () => React.useContext(PermissionsDataManagerContext);
