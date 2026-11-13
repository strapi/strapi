import * as React from 'react';

import { Tabs } from '@strapi/design-system';
import { produce } from 'immer';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import set from 'lodash/set';
import { useIntl, type MessageDescriptor } from 'react-intl';

import * as PermissonContracts from '../../../../../../../shared/contracts/permissions';
import { Permission } from '../../../../../../../shared/contracts/shared';
import { Permission as AuthPermission } from '../../../../../features/Auth';
import { isObject } from '../../../../../utils/objects';
import {
  PermissionsDataManagerContextValue,
  PermissionsDataManagerProvider,
} from '../hooks/usePermissionsDataManager';
import {
  createBulkPermissionChecker,
  createSubjectBulkPermissionChecker,
  getActionSelection,
  getAllowedConditions,
  toEnforcedPermissions,
} from '../utils/createPermissionChecker';
import { difference } from '../utils/difference';
import {
  composeLeafCheckers,
  createFieldRulesChecker,
  createSubjectFieldRulesChecker,
} from '../utils/fieldRules';
import {
  ConditionForm,
  Form,
  PropertyChildForm,
  createDefaultCTForm,
  createDefaultForm,
} from '../utils/forms';
import { GenericLayout, formatLayout } from '../utils/layouts';
import { hasLocaleValidationErrors } from '../utils/localePermissionValidation';
import { formatPermissionsForAPI } from '../utils/permissions';
import { updateConditionsToFalse } from '../utils/updateConditionsToFalse';
import { updateValuesWithPermissions } from '../utils/updateValues';

import { ContentTypes } from './ContentTypes';
import { PluginsAndSettingsPermissions } from './PluginsAndSettings';

const EMPTY_PERMISSIONS: NonNullable<PermissionsProps['permissions']> = [];

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

type PermissionsTabId = (typeof TAB_LABELS)[number]['id'];

type PermissionsLayout = PermissonContracts.GetAll.Response['data'];

/**
 * A permission as the form reports it. `fields` and `locales` may be `null`, which means all of
 * them.
 */
interface PermissionsRow {
  action: string;
  subject?: string | null;
  conditions: string[];
  properties: {
    fields?: string[] | null;
    locales?: string[] | null;
    [key: string]: unknown;
  };
}

/**
 * A change of a whole column of a tab (the "select all" of an action), as `confirmBulkChange` is
 * asked about it.
 */
interface PermissionsBulkChange {
  tab: PermissionsTabId;
  /** The id of the action, as in the layout. */
  actionId: string;
  /** The label of the action, as the column shows it. */
  label: string;
  /** The uids of the content types the change applies to. */
  subjects: string[];
  /** What the content types are about to be: granted the action (`true`) or not (`false`). */
  value: boolean;
  /** Whether a search limits `subjects` to some of the content types of the tab. */
  filtered: boolean;
}

/**
 * What the column checkbox of an action tells about its change: the content types it covers and
 * how to describe it.
 */
type GlobalActionScope = Pick<PermissionsBulkChange, 'subjects' | 'label' | 'filtered'>;

/* -------------------------------------------------------------------------------------------------
 * Permissions
 * -----------------------------------------------------------------------------------------------*/

export interface PermissionsAPI {
  getPermissions: () => {
    didUpdateConditions: boolean;
    permissionsToSend: Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>[];
  };
  hasLocaleValidationErrors: () => boolean;
  resetForm: () => void;
  setFormAfterSubmit: () => void;
}

export interface PermissionsProps {
  isFormDisabled?: boolean;
  onLocaleValidationChange?: (hasErrors: boolean) => void;
  permissions?: Permission[];
  layout: PermissionsLayout;
  /**
   * The permissions of the user editing the form. When provided, checkboxes for permissions
   * the user does not hold are disabled and bulk selections skip them.
   */
  userPermissions?: AuthPermission[];
  /**
   * Admin tokens only: conditions are inherited from `userPermissions` when a permission is
   * enabled and the conditions modal is read-only.
   */
  inheritConditions?: boolean;
  /**
   * Whether `permissions` are what the role stores on the server (the role edit page). A value
   * can then be ticked back when the row stays within the stored one, even if the row keeps
   * values the user does not hold. Not on the create page: when duplicating, `permissions` are
   * the source role's and nothing is stored for the new role yet.
   */
  permissionsAreStored?: boolean;
  /**
   * Replaces the label of a tab. `null` hides the tab (its permissions are still part of what
   * the form reports).
   */
  tabLabels?: Partial<Record<PermissionsTabId, MessageDescriptor | null>>;
  /**
   * Called with the rows `getPermissions()` would send after every change of the form, a reset
   * included. Not called for the form as it is first rendered.
   */
  onChange?: (rows: PermissionsRow[]) => void;
  /**
   * Called when a content type, plugin or settings category opens or closes, with where it is
   * (`id` is the uid of a content type, or the plugin / category key) or `null` when none is open.
   */
  onOpenSubjectChange?: (open: { tab: PermissionsTabId; id: string } | null) => void;
  /**
   * Renders actions in the row of each content type of the collection and single types tabs, next
   * to its conditions button. `disabled` is the form's `isFormDisabled`.
   */
  renderSubjectActions?: (args: {
    tab: 'collectionTypes' | 'singleTypes';
    subject: string;
    disabled: boolean;
  }) => React.ReactNode;
  /**
   * Renders content inside the open content type, plugin or settings category, under its rows (e.g.
   * the routes its actions are bound to). `subject` is what `onOpenSubjectChange` reports as `id`.
   */
  renderSubjectDetails?: (args: { tab: PermissionsTabId; subject: string }) => React.ReactNode;
  /**
   * The id of an action (e.g. `create`) that fails unless the role can set every required field of
   * the content type: a warning names the required fields the role can't set while the action is
   * granted.
   */
  requiredFieldsAction?: string;
  /**
   * Renders an indicator in the cell of an action of a content type in the collection and single
   * types tabs (e.g. a dot where the action has rules). Return `null` for none.
   */
  renderActionIndicator?: (args: { actionId: string; subject: string }) => React.ReactNode;
  /**
   * Adds a search to each tab. It lists the content types whose label or fields match (or the
   * plugins or settings categories whose name or actions match) and never changes the form. A
   * column "select all" then changes the listed content types only.
   */
  searchable?: boolean;
  /**
   * Asked before the "select all" of a column applies, with the change it is about to make. The
   * form changes when the answer is `true` and stays as it is otherwise. Not asked about any other
   * change. Without it a column applies at once.
   */
  confirmBulkChange?: (change: PermissionsBulkChange) => Promise<boolean>;
}

/**
 * @experimental Exported from `@strapi/admin/strapi-admin` for plugins that edit their own roles;
 * its props and types may change in a minor release.
 */
const Permissions = React.forwardRef<PermissionsAPI, PermissionsProps>(
  (
    {
      layout,
      isFormDisabled,
      onLocaleValidationChange,
      permissions = EMPTY_PERMISSIONS,
      userPermissions: heldPermissions,
      inheritConditions = false,
      permissionsAreStored = false,
      tabLabels,
      onChange,
      onOpenSubjectChange,
      renderSubjectActions,
      renderSubjectDetails,
      requiredFieldsAction,
      renderActionIndicator,
      searchable,
      confirmBulkChange,
    },
    api
  ) => {
    // Read once as the engine enforces them, for every check below
    const userPermissions = React.useMemo(
      () => heldPermissions && toEnforcedPermissions(heldPermissions, layout),
      [heldPermissions, layout]
    );
    const [{ initialData, layouts, modifiedData }, dispatch] = React.useReducer(
      reducer,
      initialState,
      () => init(layout, permissions, permissionsAreStored)
    );
    const { formatMessage } = useIntl();

    React.useEffect(() => {
      onLocaleValidationChange?.(hasLocaleValidationErrors(modifiedData));
    }, [modifiedData, onLocaleValidationChange]);

    // The latest `onChange` is called, so an inline callback does not report a change by itself
    const onChangeRef = React.useRef(onChange);
    const previousModifiedData = React.useRef(modifiedData);

    React.useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // The answer to a column's change is awaited, so the latest callback is the one asked, and a
    // column is not asked about again before the answer is in
    const confirmBulkChangeRef = React.useRef(confirmBulkChange);
    const isConfirmingRef = React.useRef(false);

    React.useEffect(() => {
      confirmBulkChangeRef.current = confirmBulkChange;
    }, [confirmBulkChange]);

    React.useEffect(() => {
      if (previousModifiedData.current === modifiedData) {
        return;
      }

      previousModifiedData.current = modifiedData;
      onChangeRef.current?.(getPermissionsToSend(modifiedData, initialData, permissions));
    }, [modifiedData, initialData, permissions]);

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

          const permissionsToSend = getPermissionsToSend(modifiedData, initialData, permissions);

          return { permissionsToSend, didUpdateConditions };
        },
        hasLocaleValidationErrors() {
          return hasLocaleValidationErrors(modifiedData);
        },
        resetForm() {
          dispatch({ type: 'RESET_FORM' });
        },
        setFormAfterSubmit() {
          dispatch({ type: 'SET_FORM_AFTER_SUBMIT' });
        },
      } satisfies PermissionsAPI;
    });

    // A tab the consumer hides is not rendered, but what it holds is still reported
    const tabs = TAB_LABELS.filter(({ id }) => tabLabels?.[id] !== null);

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
          inheritConditions,
        });
      },
      [userPermissions, inheritConditions]
    );

    const handleChangeCollectionTypeGlobalActionCheckbox: PermissionsDataManagerContextValue['onChangeCollectionTypeGlobalActionCheckbox'] =
      React.useCallback(
        (collectionTypeKind, actionId, value, scope) => {
          const applyChange = () =>
            dispatch({
              type: 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX',
              collectionTypeKind,
              actionId,
              value,
              subjects: scope?.subjects,
              userPermissions,
              inheritConditions,
            });
          const confirm = confirmBulkChangeRef.current;

          if (!confirm || !scope) {
            applyChange();

            return;
          }

          if (isConfirmingRef.current) {
            return;
          }

          const askThenApplyChange = async () => {
            isConfirmingRef.current = true;

            try {
              const isConfirmed = await confirm({
                tab: collectionTypeKind,
                actionId,
                label: scope.label,
                subjects: scope.subjects,
                value,
                filtered: scope.filtered,
              });

              if (isConfirmed) {
                applyChange();
              }
            } finally {
              isConfirmingRef.current = false;
            }
          };

          void askThenApplyChange();
        },
        [userPermissions, inheritConditions]
      );

    const handleChangeConditions = React.useCallback(
      (conditions: OnChangeConditionsAction['conditions']) => {
        dispatch({ type: 'ON_CHANGE_CONDITIONS', conditions, inheritConditions });
      },
      [inheritConditions]
    );

    const handleChangeSimpleCheckbox: PermissionsDataManagerContextValue['onChangeSimpleCheckbox'] =
      React.useCallback(
        ({ target: { name, value } }) => {
          dispatch({
            type: 'ON_CHANGE_SIMPLE_CHECKBOX',
            keys: name,
            value,
            userPermissions,
            inheritConditions,
          });
        },
        [userPermissions, inheritConditions]
      );

    const handleChangeParentCheckbox: PermissionsDataManagerContextValue['onChangeParentCheckbox'] =
      React.useCallback(
        ({ target: { name, value } }) => {
          dispatch({
            type: 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX',
            keys: name,
            value,
            userPermissions,
            inheritConditions,
          });
        },
        [userPermissions, inheritConditions]
      );

    return (
      <PermissionsDataManagerProvider
        availableConditions={layout.conditions}
        modifiedData={modifiedData}
        storedData={permissionsAreStored ? initialData : undefined}
        onChangeConditions={handleChangeConditions}
        onChangeSimpleCheckbox={handleChangeSimpleCheckbox}
        onChangeParentCheckbox={handleChangeParentCheckbox}
        onChangeCollectionTypeLeftActionRowCheckbox={
          handleChangeCollectionTypeLeftActionRowCheckbox
        }
        onChangeCollectionTypeGlobalActionCheckbox={handleChangeCollectionTypeGlobalActionCheckbox}
        userPermissions={userPermissions}
        inheritConditions={inheritConditions}
      >
        <Tabs.Root defaultValue={tabs[0]?.id}>
          <Tabs.List
            aria-label={formatMessage({
              id: 'Settings.permissions.users.tabs.label',
              defaultMessage: 'Tabs Permissions',
            })}
          >
            {tabs.map((tab) => (
              <Tabs.Trigger key={tab.id} value={tab.id}>
                {formatMessage(
                  tabLabels?.[tab.id] ?? { id: tab.labelId, defaultMessage: tab.defaultMessage }
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {tabs.map(({ id }) => (
            <Tabs.Content key={id} value={id}>
              {id === 'collectionTypes' || id === 'singleTypes' ? (
                <ContentTypes
                  layout={layouts[id]}
                  kind={id}
                  isFormDisabled={isFormDisabled}
                  onOpenSubjectChange={onOpenSubjectChange}
                  renderActionIndicator={renderActionIndicator}
                  renderSubjectActions={renderSubjectActions}
                  renderSubjectDetails={renderSubjectDetails}
                  requiredFieldsAction={requiredFieldsAction}
                  searchable={searchable}
                />
              ) : (
                <PluginsAndSettingsPermissions
                  layout={layouts[id]}
                  kind={id}
                  isFormDisabled={isFormDisabled}
                  onOpenSubjectChange={onOpenSubjectChange}
                  renderSubjectDetails={renderSubjectDetails}
                  searchable={searchable}
                />
              )}
            </Tabs.Content>
          ))}
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
  /**
   * Whether `initialData` is what the role stores on the server, so the bulk ticks can tick back
   * the values of the stored rows (see `permissionsAreStored`).
   */
  isInitialDataStored: boolean;
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
  isInitialDataStored: false,
  layouts: {},
};

interface OnChangeCollectionTypeGlobalActionCheckboxAction {
  type: 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX';
  collectionTypeKind: keyof PermissionForms;
  actionId: string;
  value: boolean;
  /**
   * The uids of the content types to change, the ones that have the action. Every content type of
   * the tab when absent.
   */
  subjects?: string[];
  userPermissions?: AuthPermission[];
  inheritConditions?: boolean;
}

interface OnChangeCollectionTypeRowLeftCheckboxAction {
  type: 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX';
  pathToCollectionType: string;
  propertyName: string;
  rowName: string;
  value: boolean;
  userPermissions?: AuthPermission[];
  inheritConditions?: boolean;
}

interface OnChangeConditionsAction {
  type: 'ON_CHANGE_CONDITIONS';
  conditions: Record<string, ConditionForm>;
  inheritConditions?: boolean;
}

interface OnChangeSimpleCheckboxAction {
  type: 'ON_CHANGE_SIMPLE_CHECKBOX';
  keys: string;
  value: boolean;
  userPermissions?: AuthPermission[];
  inheritConditions?: boolean;
}

interface OnChangeToggleParentCheckbox {
  type: 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX';
  keys: string;
  value: boolean;
  userPermissions?: AuthPermission[];
  inheritConditions?: boolean;
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

/**
 * Fill the conditions of a permission being enabled from the user's own conditions, so the
 * result stays within what the server accepts (see `getAllowedConditions`, which looks at what
 * is ticked for the action after the update).
 * - Admin tokens (`inheritConditions`): conditions always mirror the user's (none when the
 *   user holds the selection unconditionally).
 * - Roles: only when the user holds the selection solely under conditions and none is
 *   selected yet, so conditions picked in the modal are kept.
 */
const inheritConditionsAtPath = (
  data: unknown,
  pathToActionObject: string[],
  actionId: string,
  subject: string | null,
  userPermissions: AuthPermission[] | undefined,
  inheritConditions: boolean | undefined
) => {
  if (userPermissions === undefined) {
    return;
  }

  const obj = data as Record<string, unknown>;
  const pathToConditions = [...pathToActionObject, 'conditions'];
  const existingConditions = get(obj, pathToConditions, undefined);
  const actionForm = pathToActionObject.length === 0 ? obj : get(obj, pathToActionObject);
  const allowedConditions = getAllowedConditions(
    userPermissions,
    actionId,
    subject,
    getActionSelection(actionForm)
  );

  if (!inheritConditions) {
    const hasSelectedConditions =
      isObject(existingConditions) && Object.values(existingConditions).some(Boolean);

    if (allowedConditions === undefined || hasSelectedConditions) {
      return;
    }
  }

  const nextConditions = buildInheritedConditionsFromExisting(
    existingConditions,
    allowedConditions ?? []
  );

  if (nextConditions) {
    set(obj, pathToConditions, nextConditions);
  }
};

/**
 * The part of the stored form at `path` (within `initialData`), or `undefined` when nothing is
 * stored for the role yet.
 */
const getStoredForm = (state: State, path: string[]): unknown =>
  state.isInitialDataStored ? get(state.initialData, path) : undefined;

/**
 * The layouts of the content types of a tab by uid, empty for plugins and settings: what the field
 * rules of the layout are read from (`createFieldRulesChecker`).
 */
const getSubjectLayouts = (
  layouts: State['layouts'],
  kind: string
): Map<string, PermissonContracts.Subject> =>
  kind === 'collectionTypes' || kind === 'singleTypes'
    ? new Map(layouts[kind].subjects.map((subject) => [subject.uid, subject]))
    : new Map();

/* eslint-disable consistent-return */
const reducer = (state: State, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX': {
        const {
          collectionTypeKind,
          actionId,
          value,
          subjects,
          userPermissions,
          inheritConditions,
        } = action;
        const pathToData = ['modifiedData', collectionTypeKind];
        const subjectLayouts = getSubjectLayouts(state.layouts, collectionTypeKind);

        (subjects ?? Object.keys(get(state, pathToData))).forEach((collectionType) => {
          const collectionTypeActionData = get(
            state,
            [...pathToData, collectionType, actionId],
            undefined
          );

          if (collectionTypeActionData) {
            const subjectPermissionChecker = composeLeafCheckers(
              createFieldRulesChecker({
                subject: subjectLayouts.get(collectionType),
                actionId,
                scopePath: [],
              }),
              createBulkPermissionChecker({
                userPermissions,
                action: actionId,
                subject: collectionType,
                actionForm: collectionTypeActionData,
                scope: collectionTypeActionData,
                scopePath: [],
                value,
                storedActionForm: getStoredForm(state, [
                  collectionTypeKind,
                  collectionType,
                  actionId,
                ]),
              })
            );

            let updatedValues = updateValuesWithPermissions(
              collectionTypeActionData,
              value,
              subjectPermissionChecker
            );

            if (value === true) {
              inheritConditionsAtPath(
                updatedValues,
                [],
                actionId,
                collectionType,
                userPermissions,
                inheritConditions
              );
            }

            if (value === false) {
              // Values the user does not hold stay ticked, so only clear the conditions when
              // nothing is left selected on the action (same as the other untick paths)
              // @ts-expect-error – TODO: type better
              updatedValues = updateConditionsToFalse({ [actionId]: updatedValues })[actionId];
            }

            set(draftState, [...pathToData, collectionType, actionId], updatedValues);
          }
        });

        break;
      }
      case 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX': {
        const {
          pathToCollectionType,
          propertyName,
          rowName,
          value,
          userPermissions,
          inheritConditions,
        } = action;
        let nextModifiedDataState = cloneDeep(state.modifiedData);
        const pathToModifiedDataCollectionType = pathToCollectionType.split('..');

        const objToUpdate = get(nextModifiedDataState, pathToModifiedDataCollectionType, {});

        const subject =
          pathToModifiedDataCollectionType[pathToModifiedDataCollectionType.length - 1];
        const subjectLayout = getSubjectLayouts(
          state.layouts,
          pathToModifiedDataCollectionType[0]
        ).get(subject);

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

            const scopePath = ['properties', propertyName, rowName];

            // Undefined when neither the layout nor a user permission restriction (super admin)
            // asks for a check
            const checker = composeLeafCheckers(
              createFieldRulesChecker({
                subject: subjectLayout,
                actionId,
                scopePath,
              }),
              createBulkPermissionChecker({
                userPermissions,
                action: actionId,
                subject,
                actionForm: objToUpdate[actionId],
                scope: objValue,
                scopePath,
                value,
                storedActionForm: getStoredForm(state, [
                  ...pathToModifiedDataCollectionType,
                  actionId,
                ]),
              })
            );

            if (!isObject(objValue)) {
              const hasPermission = checker === undefined || checker([]);

              if (hasPermission) {
                set(nextModifiedDataState, pathToDataToSet, value);
                if (value === true) {
                  inheritConditionsAtPath(
                    nextModifiedDataState,
                    [...pathToModifiedDataCollectionType, actionId],
                    actionId,
                    subject,
                    userPermissions,
                    inheritConditions
                  );
                }
              }
            } else {
              const updatedValue = updateValuesWithPermissions(objValue, value, checker);

              set(nextModifiedDataState, pathToDataToSet, updatedValue);
              if (value === true) {
                inheritConditionsAtPath(
                  nextModifiedDataState,
                  [...pathToModifiedDataCollectionType, actionId],
                  actionId,
                  subject,
                  userPermissions,
                  inheritConditions
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
        if (action.inheritConditions) {
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

        // When enabling a permission, fill in the user's conditions if needed.
        if (action.value === true) {
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
                action.userPermissions,
                action.inheritConditions
              );
            } else {
              const pathToActionObject = keysArray.slice(0, propertiesIndex);
              inheritConditionsAtPath(
                nextModifiedDataState,
                pathToActionObject,
                actionId,
                null,
                action.userPermissions,
                action.inheritConditions
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
        const { keys, value, userPermissions, inheritConditions } = action;
        const pathToValue = keys.split('..');
        let nextModifiedDataState = cloneDeep(state.modifiedData);
        const oldValues = get(nextModifiedDataState, pathToValue, {});

        const root = pathToValue[0];
        // Plugin & setting permissions are stored with `subject: null` and their real
        // action id is the full `plugin::`/`admin::` leaf segment (not the UI subcategory).
        // For those, let the checker derive the action from each leaf path (subject stays null).
        const isPluginOrSetting = root === 'plugins' || root === 'settings';

        let actionId: string | undefined;
        let subject: string | null | undefined;

        if (isPluginOrSetting) {
          subject = null;
        } else {
          if (pathToValue.length >= 2) {
            subject = pathToValue[1];
          }

          if (pathToValue.length >= 3) {
            actionId = pathToValue[2];
          }
        }

        const subjectLayout = getSubjectLayouts(state.layouts, root).get(subject ?? '');

        const permissionChecker =
          actionId === undefined
            ? composeLeafCheckers(
                createSubjectFieldRulesChecker({ subject: subjectLayout }),
                createSubjectBulkPermissionChecker({
                  userPermissions,
                  subject,
                  subjectForm: oldValues,
                  value,
                  storedSubjectForm: getStoredForm(state, pathToValue),
                })
              )
            : composeLeafCheckers(
                createFieldRulesChecker({
                  subject: subjectLayout,
                  actionId,
                  scopePath: pathToValue.slice(3),
                }),
                createBulkPermissionChecker({
                  userPermissions,
                  action: actionId,
                  subject,
                  actionForm: get(nextModifiedDataState, pathToValue.slice(0, 3)),
                  scope: oldValues,
                  scopePath: pathToValue.slice(3),
                  value,
                  storedActionForm: getStoredForm(state, pathToValue.slice(0, 3)),
                })
              );

        const updatedValues = updateValuesWithPermissions(oldValues, value, permissionChecker);

        set(nextModifiedDataState, pathToValue, updatedValues);

        // When enabling, fill in the user's conditions if needed.
        if (value === true) {
          const subjectForLookup =
            root === 'collectionTypes' || root === 'singleTypes' ? (subject ?? null) : null;

          if (actionId !== undefined && subjectForLookup !== null) {
            // The conditions belong to the action, also when the toggled checkbox is a component
            // or a nested field group inside it, and depend on everything ticked for the action
            inheritConditionsAtPath(
              nextModifiedDataState,
              pathToValue.slice(0, 3),
              actionId,
              subjectForLookup,
              userPermissions,
              inheritConditions
            );
          } else if (isObject(updatedValues)) {
            const updatedValuesObj = updatedValues as Record<string, unknown>;

            Object.keys(updatedValuesObj).forEach((key) => {
              const maybeActionObj = updatedValuesObj[key];
              if (isObject(maybeActionObj)) {
                inheritConditionsAtPath(
                  maybeActionObj,
                  [],
                  key,
                  subjectForLookup,
                  userPermissions,
                  inheritConditions
                );
              }
            });
          }
        }

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
 * restoreNullLocalesIfUnchanged
 * Extracted at module level to avoid nesting arrow functions more than 4 levels deep inside
 * the useImperativeHandle → getPermissions → map chain.
 * -----------------------------------------------------------------------------------------------*/

type SentPermission = Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'actionParameters'>;

const restoreNullLocalesIfUnchanged = (
  perm: SentPermission,
  originalPermissions: Permission[],
  initialData: PermissionForms,
  modifiedData: PermissionForms
): SentPermission => {
  if (!perm.subject) return perm;

  const original = originalPermissions.find(
    (p) => p.action === perm.action && p.subject === perm.subject
  );

  // null means "all locales" in legacy DBs — preserve it if the user hasn't changed anything
  if (original?.properties?.locales !== null) return perm;

  const kind =
    perm.subject in modifiedData.collectionTypes
      ? ('collectionTypes' as const)
      : perm.subject in modifiedData.singleTypes
        ? ('singleTypes' as const)
        : null;
  if (!kind) return perm;

  const initialActionForm = initialData[kind]?.[perm.subject]?.[perm.action];
  const modifiedActionForm = modifiedData[kind]?.[perm.subject]?.[perm.action];

  if (!initialActionForm || !modifiedActionForm) return perm;

  const initialLocaleEntry = (initialActionForm.properties as PropertyChildForm)['locales'];
  const modifiedLocaleEntry = (modifiedActionForm.properties as PropertyChildForm)['locales'];

  if (
    !initialLocaleEntry ||
    typeof initialLocaleEntry === 'boolean' ||
    !modifiedLocaleEntry ||
    typeof modifiedLocaleEntry === 'boolean'
  ) {
    return perm;
  }

  const localesUnchanged =
    Object.keys(initialLocaleEntry).length === Object.keys(modifiedLocaleEntry).length &&
    Object.entries(initialLocaleEntry).every(
      ([locale, val]) => modifiedLocaleEntry[locale] === val
    );

  if (!localesUnchanged) return perm;

  return { ...perm, properties: { ...perm.properties, locales: null } };
};

/**
 * The rows the form sends: `getPermissions()` returns them and `onChange` reports them.
 */
const getPermissionsToSend = (
  modifiedData: PermissionForms,
  initialData: PermissionForms,
  permissions: Permission[]
): SentPermission[] =>
  formatPermissionsForAPI(modifiedData).map((perm) =>
    restoreNullLocalesIfUnchanged(perm, permissions, initialData, modifiedData)
  );

/* -------------------------------------------------------------------------------------------------
 * init (reducer)
 * -----------------------------------------------------------------------------------------------*/

const init = (
  layout: PermissionsProps['layout'],
  permissions: PermissionsProps['permissions'],
  isInitialDataStored: boolean
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
    isInitialDataStored,
    layouts,
  };
};

export { Permissions };
export type {
  GlobalActionScope,
  PermissionsBulkChange,
  PermissionsLayout,
  PermissionsRow,
  PermissionsTabId,
  State,
  OnChangeCollectionTypeRowLeftCheckboxAction,
  OnChangeConditionsAction,
  OnChangeCollectionTypeGlobalActionCheckboxAction,
};
