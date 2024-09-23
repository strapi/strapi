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
import { isObject } from '../../../../../utils/objects';
import {
  PermissionsDataManagerContextValue,
  PermissionsDataManagerProvider,
} from '../hooks/usePermissionsDataManager';
import { difference } from '../utils/difference';
import { ConditionForm, Form, createDefaultCTForm, createDefaultForm } from '../utils/forms';
import { GenericLayout, formatLayout } from '../utils/layouts';
import { formatPermissionsForAPI } from '../utils/permissions';
import { updateConditionsToFalse } from '../utils/updateConditionsToFalse';
import { updateValues } from '../utils/updateValues';

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
}

const Permissions = React.forwardRef<PermissionsAPI, PermissionsProps>(
  ({ layout, isFormDisabled, permissions = [] }, api) => {
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

    const handleChangeCollectionTypeLeftActionRowCheckbox = (
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
      });
    };

    const handleChangeCollectionTypeGlobalActionCheckbox = (
      collectionTypeKind: OnChangeCollectionTypeGlobalActionCheckboxAction['collectionTypeKind'],
      actionId: OnChangeCollectionTypeGlobalActionCheckboxAction['actionId'],
      value: OnChangeCollectionTypeGlobalActionCheckboxAction['value']
    ) => {
      dispatch({
        type: 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX',
        collectionTypeKind,
        actionId,
        value,
      });
    };

    const handleChangeConditions = (conditions: OnChangeConditionsAction['conditions']) => {
      dispatch({ type: 'ON_CHANGE_CONDITIONS', conditions });
    };

    const handleChangeSimpleCheckbox: PermissionsDataManagerContextValue['onChangeSimpleCheckbox'] =
      React.useCallback(({ target: { name, value } }) => {
        dispatch({
          type: 'ON_CHANGE_SIMPLE_CHECKBOX',
          keys: name,
          value,
        });
      }, []);

    const handleChangeParentCheckbox: PermissionsDataManagerContextValue['onChangeParentCheckbox'] =
      React.useCallback(({ target: { name, value } }) => {
        dispatch({
          type: 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX',
          keys: name,
          value,
        });
      }, []);

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
}

interface OnChangeCollectionTypeRowLeftCheckboxAction {
  type: 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX';
  pathToCollectionType: string;
  propertyName: string;
  rowName: string;
  value: boolean;
}

interface OnChangeConditionsAction {
  type: 'ON_CHANGE_CONDITIONS';
  conditions: Record<string, ConditionForm>;
}

interface OnChangeSimpleCheckboxAction {
  type: 'ON_CHANGE_SIMPLE_CHECKBOX';
  keys: string;
  value: boolean;
}

interface OnChangeToggleParentCheckbox {
  type: 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX';
  keys: string;
  value: boolean;
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

/* eslint-disable consistent-return */
const reducer = (state: State, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      // This action is called when a checkbox in the <GlobalActions />
      // changes
      case 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX': {
        const { collectionTypeKind, actionId, value } = action;
        const pathToData = ['modifiedData', collectionTypeKind];

        Object.keys(get(state, pathToData)).forEach((collectionType) => {
          const collectionTypeActionData = get(
            state,
            [...pathToData, collectionType, actionId],
            undefined
          );

          if (collectionTypeActionData) {
            let updatedValues = updateValues(collectionTypeActionData, value);

            // We need to remove the applied conditions
            // @ts-expect-error – TODO: type better
            if (!value && updatedValues.conditions) {
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
        const { pathToCollectionType, propertyName, rowName, value } = action;
        let nextModifiedDataState = cloneDeep(state.modifiedData);
        const pathToModifiedDataCollectionType = pathToCollectionType.split('..');

        const objToUpdate = get(nextModifiedDataState, pathToModifiedDataCollectionType, {});

        Object.keys(objToUpdate).forEach((actionId) => {
          // When a ct has multiple properties (ex: locales, field)
          // We need to make sure that we add any new property to the modifiedData
          // object.
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
              set(nextModifiedDataState, pathToDataToSet, value);
            } else {
              const updatedValue = updateValues(objValue, value);

              set(nextModifiedDataState, pathToDataToSet, updatedValue);
            }
          }
        });

        // When we uncheck a row, we need to check if we also need to disable the conditions
        if (!value) {
          // @ts-expect-error – TODO: type better
          nextModifiedDataState = updateConditionsToFalse(nextModifiedDataState);
        }

        set(draftState, 'modifiedData', nextModifiedDataState);

        break;
      }
      case 'ON_CHANGE_CONDITIONS': {
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

        set(nextModifiedDataState, [...action.keys.split('..')], action.value);

        // When we uncheck a single checkbox we need to remove the conditions from the parent
        if (!action.value) {
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
        const { keys, value } = action;
        const pathToValue = [...keys.split('..')];
        let nextModifiedDataState = cloneDeep(state.modifiedData);
        const oldValues = get(nextModifiedDataState, pathToValue, {});

        const updatedValues = updateValues(oldValues, value);
        set(nextModifiedDataState, pathToValue, updatedValues);

        // When we uncheck a parent checkbox we need to remove the associated conditions
        if (!value) {
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
