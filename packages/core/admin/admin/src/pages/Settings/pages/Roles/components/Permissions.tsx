import * as React from 'react';

import { Tabs } from '@strapi/design-system';
import { produce } from 'immer';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import set from 'lodash/set';
import { useIntl } from 'react-intl';

import * as PermissonContracts from '../../../../../../../shared/contracts/permissions';
import { Permission } from '../../../../../../../shared/contracts/shared';
import { Permission as AuthPermission } from '../../../../../features/Auth';
import { isObject } from '../../../../../utils/objects';
import {
  PermissionsDataManagerContextValue,
  PermissionsDataManagerProvider,
} from '../hooks/usePermissionsDataManager';
import {
  createFieldPermissionChecker,
  createDynamicActionPermissionChecker,
} from '../utils/createPermissionChecker';
import { difference } from '../utils/difference';
import { ConditionForm, Form, createDefaultCTForm, createDefaultForm } from '../utils/forms';
import { GenericLayout, formatLayout } from '../utils/layouts';
import { formatPermissionsForAPI } from '../utils/permissions';
import { updateConditionsToFalse } from '../utils/updateConditionsToFalse';
import { updateValues, updateValuesWithPermissions } from '../utils/updateValues';

import { ContentTypes } from './ContentTypes';
import { PluginsAndSettingsPermissions } from './PluginsAndSettings';

const TAB_LABELS = [
  {
    labelId: 'app.components.LeftMenuLinkContainer.collectionTypes',
    defaultMessage: 'Collection Types',
    id: 'collectionTypes',
  },
  {
    labelId: 'app.components.LeftMenuLinkContainer.singleTypes',
    id: 'singleTypes',
    defaultMessage: 'Single Types',
  },
  {
    labelId: 'app.components.LeftMenuLinkContainer.plugins',
    defaultMessage: 'Plugins',
    id: 'plugins',
  },
  {
    labelId: 'app.components.LeftMenuLinkContainer.settings',
    defaultMessage: 'Settings',
    id: 'settings',
  },
] as const;

/* -------------------------------------------------------------------------------------------------
 * Permissions
 * -----------------------------------------------------------------------------------------------*/

export interface PermissionsAPI {
  getPermissions: () => {
    didUpdateConditions: boolean;
    permissionsToSend: Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>[];
  };
  resetForm: () => void;
  setFormAfterSubmit: () => void;
}

interface PermissionsProps {
  isFormDisabled?: boolean;
  permissions?: Permission[];
  layout: PermissonContracts.GetAll.Response['data'];
  userPermissions?: AuthPermission[];
}

const Permissions = React.forwardRef<PermissionsAPI, PermissionsProps>(
  ({ layout, isFormDisabled, permissions = [], userPermissions }, api) => {
    const [{ initialData, layouts, modifiedData }, dispatch] = React.useReducer(
      reducer,
      initialState,
      () => init(layout, permissions)
    );
    const { formatMessage } = useIntl();

    React.useImperativeHandle(api, () => {
      return {
        getPermissions() {
          const collectionTypesDiff = difference(
            initialData.collectionTypes,
            modifiedData.collectionTypes
          );
          const singleTypesDiff = difference(initialData.singleTypes, modifiedData.singleTypes);

          const contentTypesDiff = { ...collectionTypesDiff, ...singleTypesDiff };

          let didUpdateConditions;

          if (isEmpty(contentTypesDiff)) {
            didUpdateConditions = false;
          } else {
            didUpdateConditions = Object.values(contentTypesDiff).some((permission = {}) => {
              return Object.values(permission).some((permissionValue) =>
                has(permissionValue, 'conditions')
              );
            });
          }

          return { permissionsToSend: formatPermissionsForAPI(modifiedData), didUpdateConditions };
        },
        resetForm() {
          dispatch({ type: 'RESET_FORM' });
        },
        setFormAfterSubmit() {
          dispatch({ type: 'SET_FORM_AFTER_SUBMIT' });
        },
      } satisfies PermissionsAPI;
    });

    const handleChangeCollectionTypeLeftActionRowCheckbox = React.useCallback(
      (
        pathToCollectionType: OnChangeCollectionTypeRowLeftCheckboxAction['pathToCollectionType'],
        propertyName: OnChangeCollectionTypeRowLeftCheckboxAction['propertyName'],
        rowName: OnChangeCollectionTypeRowLeftCheckboxAction['rowName'],
        value: OnChangeCollectionTypeRowLeftCheckboxAction['value']
      ) => {
        dispatch({
          type: 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX',
          pathToCollectionType,
          propertyName,
          rowName,
          value,
          userPermissions,
        });
      },
      [userPermissions]
    );

    const handleChangeCollectionTypeGlobalActionCheckbox = React.useCallback(
      (
        collectionTypeKind: OnChangeCollectionTypeGlobalActionCheckboxAction['collectionTypeKind'],
        actionId: OnChangeCollectionTypeGlobalActionCheckboxAction['actionId'],
        value: OnChangeCollectionTypeGlobalActionCheckboxAction['value']
      ) => {
        dispatch({
          type: 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX',
          collectionTypeKind,
          actionId,
          value,
          userPermissions,
        });
      },
      [userPermissions]
    );

    const handleChangeConditions = React.useCallback(
      (conditions: OnChangeConditionsAction['conditions']) => {
        dispatch({ type: 'ON_CHANGE_CONDITIONS', conditions, userPermissions });
      },
      [userPermissions]
    );

    const handleChangeSimpleCheckbox: PermissionsDataManagerContextValue['onChangeSimpleCheckbox'] =
      React.useCallback(
        ({ target: { name, value } }) => {
          dispatch({
            type: 'ON_CHANGE_SIMPLE_CHECKBOX',
            keys: name,
            value,
            userPermissions,
          });
        },
        [userPermissions]
      );

    const handleChangeParentCheckbox: PermissionsDataManagerContextValue['onChangeParentCheckbox'] =
      React.useCallback(
        ({ target: { name, value } }) => {
          dispatch({
            type: 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX',
            keys: name,
            value,
            userPermissions,
          });
        },
        [userPermissions]
      );

    return (
      <PermissionsDataManagerProvider
        availableConditions={layout.conditions}
        modifiedData={modifiedData}
        onChangeConditions={handleChangeConditions}
        onChangeSimpleCheckbox={handleChangeSimpleCheckbox}
        onChangeParentCheckbox={handleChangeParentCheckbox}
        onChangeCollectionTypeLeftActionRowCheckbox={
          handleChangeCollectionTypeLeftActionRowCheckbox
        }
        onChangeCollectionTypeGlobalActionCheckbox={handleChangeCollectionTypeGlobalActionCheckbox}
        userPermissions={userPermissions}
      >
        <Tabs.Root defaultValue={TAB_LABELS[0].id}>
          <Tabs.List
            aria-label={formatMessage({
              id: 'Settings.permissions.users.tabs.label',
              defaultMessage: 'Tabs Permissions',
            })}
          >
            {TAB_LABELS.map((tabLabel) => (
              <Tabs.Trigger key={tabLabel.id} value={tabLabel.id}>
                {formatMessage({ id: tabLabel.labelId, defaultMessage: tabLabel.defaultMessage })}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Tabs.Content value={TAB_LABELS[0].id}>
            <ContentTypes
              layout={layouts.collectionTypes}
              kind="collectionTypes"
              isFormDisabled={isFormDisabled}
            />
          </Tabs.Content>
          <Tabs.Content value={TAB_LABELS[1].id}>
            <ContentTypes
              layout={layouts.singleTypes}
              kind="singleTypes"
              isFormDisabled={isFormDisabled}
            />
          </Tabs.Content>
          <Tabs.Content value={TAB_LABELS[2].id}>
            <PluginsAndSettingsPermissions
              layout={layouts.plugins}
              kind="plugins"
              isFormDisabled={isFormDisabled}
            />
          </Tabs.Content>
          <Tabs.Content value={TAB_LABELS[3].id}>
            <PluginsAndSettingsPermissions
              layout={layouts.settings}
              kind="settings"
              isFormDisabled={isFormDisabled}
            />
          </Tabs.Content>
        </Tabs.Root>
      </PermissionsDataManagerProvider>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * reducer
 * -----------------------------------------------------------------------------------------------*/

interface PermissionForms {
  collectionTypes: Form;
  plugins: Record<string, Form>;
  settings: Record<string, Form>;
  singleTypes: Form;
}

interface State {
  initialData: PermissionForms;
  modifiedData: PermissionForms;
  layouts: {
    collectionTypes: PermissonContracts.ContentPermission;
    singleTypes: PermissonContracts.ContentPermission;
    plugins: GenericLayout<PermissonContracts.PluginPermission>[];
    settings: GenericLayout<PermissonContracts.SettingPermission>[];
  };
}

const initialState = {
  initialData: {},
  modifiedData: {},
  layouts: {},
};

interface OnChangeCollectionTypeGlobalActionCheckboxAction {
  type: 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX';
  collectionTypeKind: keyof PermissionForms;
  actionId: string;
  value: boolean;
  userPermissions?: AuthPermission[];
}

interface OnChangeCollectionTypeRowLeftCheckboxAction {
  type: 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX';
  pathToCollectionType: string;
  propertyName: string;
  rowName: string;
  value: boolean;
  userPermissions?: AuthPermission[];
}

interface OnChangeConditionsAction {
  type: 'ON_CHANGE_CONDITIONS';
  conditions: Record<string, ConditionForm>;
  userPermissions?: AuthPermission[];
}

interface OnChangeSimpleCheckboxAction {
  type: 'ON_CHANGE_SIMPLE_CHECKBOX';
  keys: string;
  value: boolean;
  userPermissions?: AuthPermission[];
}

interface OnChangeToggleParentCheckbox {
  type: 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX';
  keys: string;
  value: boolean;
  userPermissions?: AuthPermission[];
}

interface ResetFormAction {
  type: 'RESET_FORM';
}

interface SetFormAfterSubmitAction {
  type: 'SET_FORM_AFTER_SUBMIT';
}

type Action =
  | OnChangeCollectionTypeGlobalActionCheckboxAction
  | OnChangeCollectionTypeRowLeftCheckboxAction
  | OnChangeConditionsAction
  | OnChangeSimpleCheckboxAction
  | OnChangeToggleParentCheckbox
  | ResetFormAction
  | SetFormAfterSubmitAction;

const buildInheritedConditionsFromExisting = (
  existing: unknown,
  enabledConditions: string[] = []
): Record<string, boolean> | undefined => {
  if (!isObject(existing)) {
    return undefined;
  }

  const enabled = new Set(enabledConditions);

  return Object.keys(existing).reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = enabled.has(key);

    return acc;
  }, {});
};

const inheritConditionsAtPath = (
  data: unknown,
  pathToActionObject: string[],
  actionId: string,
  subject: string | null,
  userPermissions: AuthPermission[] | undefined
) => {
  if (userPermissions === undefined) {
    return;
  }

  const matchingPermission = userPermissions.find(
    (perm) => perm.action === actionId && perm.subject === subject
  );

  if (matchingPermission === undefined) {
    return;
  }

  const obj = data as Record<string, unknown>;
  const existingConditions = get(obj, [...pathToActionObject, 'conditions'], undefined);
  const nextConditions = buildInheritedConditionsFromExisting(
    existingConditions,
    matchingPermission.conditions ?? []
  );

  if (nextConditions) {
    set(obj, [...pathToActionObject, 'conditions'], nextConditions);
  }
};

/* eslint-disable consistent-return */
const reducer = (state: State, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX': {
        const { collectionTypeKind, actionId, value, userPermissions } = action;
        const pathToData = ['modifiedData', collectionTypeKind];

        Object.keys(get(state, pathToData)).forEach((collectionType) => {
          const collectionTypeActionData = get(
            state,
            [...pathToData, collectionType, actionId],
            undefined
          );

          if (collectionTypeActionData) {
            const subjectPermissionChecker = createFieldPermissionChecker(
              actionId,
              collectionType,
              userPermissions
            );

            let updatedValues = updateValuesWithPermissions(
              collectionTypeActionData,
              value,
              subjectPermissionChecker
            );

            if (value === true) {
              inheritConditionsAtPath(updatedValues, [], actionId, collectionType, userPermissions);
            }

            if (value === false && updatedValues.conditions !== undefined) {
              // @ts-expect-error – TODO: type better
              const updatedConditions = updateValues(updatedValues.conditions, false);

              updatedValues = { ...updatedValues, conditions: updatedConditions };
            }

            set(draftState, [...pathToData, collectionType, actionId], updatedValues);
          }
        });

        break;
      }
      case 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX': {
        const { pathToCollectionType, propertyName, rowName, value, userPermissions } = action;
        let nextModifiedDataState = cloneDeep(state.modifiedData);
        const pathToModifiedDataCollectionType = pathToCollectionType.split('..');

        const objToUpdate = get(nextModifiedDataState, pathToModifiedDataCollectionType, {});

        const subject =
          pathToModifiedDataCollectionType[pathToModifiedDataCollectionType.length - 1];

        Object.keys(objToUpdate).forEach((actionId) => {
          if (has(objToUpdate[actionId], `properties.${propertyName}`)) {
            const objValue = get(objToUpdate, [actionId, 'properties', propertyName, rowName]);
            const pathToDataToSet = [
              ...pathToModifiedDataCollectionType,
              actionId,
              'properties',
              propertyName,
              rowName,
            ];

            if (!isObject(objValue)) {
              if (userPermissions !== undefined && propertyName === 'fields') {
                const hasPermission = userPermissions.some((perm) => {
                  if (perm.action !== actionId || perm.subject !== subject) return false;

                  const fields = perm.properties?.fields;
                  if (fields === null || fields === undefined) return true;
                  if (Array.isArray(fields) && fields.length === 0) return false;

                  return (
                    Array.isArray(fields) &&
                    fields.some((f) => rowName === f || rowName.startsWith(`${f}.`))
                  );
                });

                if (hasPermission === true) {
                  set(nextModifiedDataState, pathToDataToSet, value);
                  if (value === true) {
                    inheritConditionsAtPath(
                      nextModifiedDataState,
                      [...pathToModifiedDataCollectionType, actionId],
                      actionId,
                      subject,
                      userPermissions
                    );
                  }
                }
              } else {
                set(nextModifiedDataState, pathToDataToSet, value);
                if (value === true && userPermissions !== undefined) {
                  inheritConditionsAtPath(
                    nextModifiedDataState,
                    [...pathToModifiedDataCollectionType, actionId],
                    actionId,
                    subject,
                    userPermissions
                  );
                }
              }
            } else {
              const permissionChecker =
                userPermissions !== undefined && propertyName === 'fields'
                  ? (path: string[]) => {
                      const fullFieldPath = [rowName, ...path].join('.');
                      const checker = createFieldPermissionChecker(
                        actionId,
                        subject,
                        userPermissions
                      );
                      return checker === undefined
                        ? true
                        : checker(['properties', 'fields', fullFieldPath]);
                    }
                  : undefined;

              const updatedValue = updateValuesWithPermissions(objValue, value, permissionChecker);

              set(nextModifiedDataState, pathToDataToSet, updatedValue);
              if (value === true && userPermissions !== undefined) {
                inheritConditionsAtPath(
                  nextModifiedDataState,
                  [...pathToModifiedDataCollectionType, actionId],
                  actionId,
                  subject,
                  userPermissions
                );
              }
            }
          }
        });

        if (value === false) {
          // @ts-expect-error – TODO: type better
          nextModifiedDataState = updateConditionsToFalse(nextModifiedDataState);
        }

        set(draftState, 'modifiedData', nextModifiedDataState);

        break;
      }
      case 'ON_CHANGE_CONDITIONS': {
        // In App Token context, conditions are inherited from the user's permissions and must be read-only.
        if (action.userPermissions !== undefined) {
          break;
        }

        Object.entries(action.conditions).forEach((array) => {
          const [stringPathToData, conditionsToUpdate] = array;

          set(
            draftState,
            ['modifiedData', ...stringPathToData.split('..'), 'conditions'],
            conditionsToUpdate
          );
        });

        break;
      }
      case 'ON_CHANGE_SIMPLE_CHECKBOX': {
        let nextModifiedDataState = cloneDeep(state.modifiedData);

        const keysArray = action.keys.split('..');
        set(nextModifiedDataState, [...keysArray], action.value);

        // In App Token context, when enabling a permission, inherit the user's conditions.
        if (action.value === true && action.userPermissions !== undefined) {
          const propertiesIndex = keysArray.indexOf('properties');

          if (propertiesIndex > 0) {
            const actionId = keysArray[propertiesIndex - 1];
            const root = keysArray[0];

            if ((root === 'collectionTypes' || root === 'singleTypes') && keysArray.length >= 3) {
              const subject = keysArray[1];
              inheritConditionsAtPath(
                nextModifiedDataState,
                [root, subject, actionId],
                actionId,
                subject,
                action.userPermissions
              );
            } else {
              const pathToActionObject = keysArray.slice(0, propertiesIndex);
              inheritConditionsAtPath(
                nextModifiedDataState,
                pathToActionObject,
                actionId,
                null,
                action.userPermissions
              );
            }
          }
        }

        if (action.value === false) {
          // @ts-expect-error – TODO: type better
          nextModifiedDataState = updateConditionsToFalse(nextModifiedDataState);
        }

        set(draftState, 'modifiedData', nextModifiedDataState);

        break;
      }
      /*
       * Here the idea is to retrieve a specific value of the modifiedObject
       * then update all the boolean values of the retrieved one
       * and update the drafState.
       *
       * For instance in order to enable create action for all the fields and locales
       * of the restaurant content type we need to :
       * 1. Retrieve the modifiedData.collectionTypes.restaurant.create object
       * 2. Toggle all the end boolean values to the desired one
       * 3. Update the draftState
       *
       * Since the case works well in order to update what we called "parent" checkbox. We can
       * reuse the action when we need to toggle change all the values that depends on this one.
       * A parent checkbox is a checkbox which value is not a boolean but depends on its children ones, therefore,
       * a parent checkbox does not have a represented value in the draftState, they are just helpers.
       *
       * Given the following data:
       *
       * const data = {
       *  restaurant: {
       *   create: {
       *     fields: { name: true },
       *     locales: { en: false }
       *   }
       *  }
       * }
       *
       * The value of the create checkbox for the restaurant will be ƒalse since not all its children have
       * truthy values and in order to set its value to true when need to have all the values of its children set to true.
       *
       * Similarly, we can reuse the logic for the components attributes
       *
       */
      case 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX': {
        const { keys, value, userPermissions } = action;
        const pathToValue = [...keys.split('..')];
        let nextModifiedDataState = cloneDeep(state.modifiedData);
        const oldValues = get(nextModifiedDataState, pathToValue, {});

        let actionId: string | undefined;
        let subject: string | undefined;

        if (pathToValue.length >= 2) {
          subject = pathToValue[1];
        }

        if (pathToValue.length >= 3) {
          actionId = pathToValue[2];
        }

        const permissionChecker = createDynamicActionPermissionChecker(
          subject,
          actionId,
          userPermissions
        );

        const updatedValues = updateValuesWithPermissions(oldValues, value, permissionChecker);

        // In App Token context, when enabling, inherit conditions from the user's permissions.
        if (value === true && userPermissions !== undefined) {
          const root = pathToValue[0];
          const subjectForLookup =
            root === 'collectionTypes' || root === 'singleTypes' ? (subject ?? null) : null;

          if (actionId !== undefined && subjectForLookup !== null) {
            inheritConditionsAtPath(updatedValues, [], actionId, subjectForLookup, userPermissions);
          } else if (isObject(updatedValues)) {
            const updatedValuesObj = updatedValues as Record<string, unknown>;

            Object.keys(updatedValuesObj).forEach((key) => {
              const maybeActionObj = updatedValuesObj[key];
              if (isObject(maybeActionObj)) {
                inheritConditionsAtPath(maybeActionObj, [], key, subjectForLookup, userPermissions);
              }
            });
          }
        }

        set(nextModifiedDataState, pathToValue, updatedValues);

        if (value === false) {
          // @ts-expect-error – TODO: type better
          nextModifiedDataState = updateConditionsToFalse(nextModifiedDataState);
        }

        set(draftState, ['modifiedData'], nextModifiedDataState);

        break;
      }
      case 'RESET_FORM': {
        draftState.modifiedData = state.initialData;
        break;
      }
      case 'SET_FORM_AFTER_SUBMIT': {
        draftState.initialData = state.modifiedData;
        break;
      }
      default:
        return draftState;
    }
  });

/* -------------------------------------------------------------------------------------------------
 * init (reducer)
 * -----------------------------------------------------------------------------------------------*/

const init = (
  layout: PermissionsProps['layout'],
  permissions: PermissionsProps['permissions']
): State => {
  const {
    conditions,
    sections: { collectionTypes, singleTypes, plugins, settings },
  } = layout;

  const layouts = {
    collectionTypes,
    singleTypes,
    plugins: formatLayout(plugins, 'plugin'),
    settings: formatLayout(settings, 'category'),
  };

  const defaultForm = {
    collectionTypes: createDefaultCTForm(collectionTypes, conditions, permissions),
    singleTypes: createDefaultCTForm(singleTypes, conditions, permissions),
    plugins: createDefaultForm(layouts.plugins, conditions, permissions),
    settings: createDefaultForm(layouts.settings, conditions, permissions),
  };

  return {
    initialData: defaultForm,
    modifiedData: defaultForm,
    layouts,
  };
};

export { Permissions };
export type {
  State,
  OnChangeCollectionTypeRowLeftCheckboxAction,
  OnChangeConditionsAction,
  OnChangeCollectionTypeGlobalActionCheckboxAction,
};
