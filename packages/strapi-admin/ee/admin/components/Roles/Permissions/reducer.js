/* eslint-disable indent */
/* eslint-disable consistent-return */
import produce, { current } from 'immer';
import { get, set, differenceWith } from 'lodash';

import {
  STATIC_ATTRIBUTE_ACTIONS,
  getAttributePermissionsSizeByContentTypeAction,
  CONTENT_MANAGER_PREFIX,
  isAttributeAction,
} from '../../../../../admin/src/components/Roles/Permissions/utils';

export const initialState = {
  collapsePath: [],
  permissionsLayout: {},
  contentTypesPermissions: {},
  pluginsAndSettingsPermissions: [],
  initialData: {},
  isSuperAdmin: false,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      // This reducer action is used to enable/disable a single attribute action
      case 'ALL_ATTRIBUTE_ACTIONS_SELECT': {
        const { subject, attribute, shouldEnable } = action;
        const attributePath = [
          'contentTypesPermissions',
          subject,
          'attributes',
          attribute.attributeName,
          'actions',
        ];

        if (shouldEnable) {
          set(draftState, attributePath, STATIC_ATTRIBUTE_ACTIONS);
        } else {
          set(
            draftState,
            attributePath,
            attribute.required ? [`${CONTENT_MANAGER_PREFIX}.create`] : []
          );
          const existingConditions = STATIC_ATTRIBUTE_ACTIONS.filter(
            action =>
              getAttributePermissionsSizeByContentTypeAction(
                current(draftState.contentTypesPermissions),
                subject,
                action
              ) === 0
          );

          existingConditions.forEach(condition => {
            const hasCondition = get(
              current(draftState),
              ['contentTypesPermissions', subject, 'conditions', condition],
              false
            );

            if (hasCondition) {
              delete draftState.contentTypesPermissions[subject].conditions[condition];
            }
          });
        }
        break;
      }
      // This reducer action is used to enable/disable all
      // content type attributes actions recursively
      case 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT': {
        const { subject, attributes, shouldEnable, shouldSetAllContentTypes } = action;

        if (shouldSetAllContentTypes) {
          const staticActionsName = get(state.permissionsLayout, ['sections', 'contentTypes'], [])
            .filter(
              contentTypeAction =>
                contentTypeAction.subjects.includes(subject) &&
                !isAttributeAction(contentTypeAction.action)
            )
            .map(contentTypeAction => contentTypeAction.action);

          staticActionsName.forEach(action => {
            set(
              draftState,
              ['contentTypesPermissions', subject, 'contentTypeActions', action],
              shouldEnable
            );
          });
        }

        if (shouldEnable) {
          attributes.forEach(attribute => {
            set(
              draftState,
              [
                'contentTypesPermissions',
                subject,
                'attributes',
                attribute.attributeName,
                'actions',
              ],
              STATIC_ATTRIBUTE_ACTIONS
            );
          });
        } else {
          attributes.forEach(attribute => {
            set(
              draftState,
              [
                'contentTypesPermissions',
                subject,
                'attributes',
                attribute.attributeName,
                'actions',
              ],
              []
            );
          });

          const existingConditions = STATIC_ATTRIBUTE_ACTIONS.filter(
            action =>
              getAttributePermissionsSizeByContentTypeAction(
                current(draftState.contentTypesPermissions),
                subject,
                action
              ) === 0
          );

          const allConditions = state.permissionsLayout.sections.contentTypes.map(
            section => section.action
          );
          const conditionsToRemove = shouldSetAllContentTypes ? allConditions : existingConditions;

          conditionsToRemove.forEach(condition => {
            const hasCondition = get(
              current(draftState),
              ['contentTypesPermissions', subject, 'conditions', condition],
              false
            );

            if (hasCondition) {
              delete draftState.contentTypesPermissions[subject].conditions[condition];
            }
          });
        }

        break;
      }
      // This reducer action is used to enable/disable a single attribute action
      case 'ATTRIBUTE_PERMISSION_SELECT': {
        const { subject, action: permissionAction, attribute } = action;
        const attributeActionPath = [subject, 'attributes', attribute, 'actions'];
        const attributeActions = get(state.contentTypesPermissions, attributeActionPath, []);
        const subjectActions = getAttributePermissionsSizeByContentTypeAction(
          state.contentTypesPermissions,
          subject,
          permissionAction
        );
        const hasContentTypeAction = get(
          state.contentTypesPermissions,
          [subject, 'contentTypeActions', permissionAction],
          false
        );

        const isExist = attributeActions.includes(permissionAction);

        if (!isExist) {
          if (attributeActions.length > 0) {
            draftState.contentTypesPermissions[subject].attributes[attribute].actions.push(
              permissionAction
            );
          } else {
            draftState.contentTypesPermissions[subject] = {
              ...get(state.contentTypesPermissions, [subject], {}),
              attributes: {
                ...get(state.contentTypesPermissions, [subject, 'attributes'], {}),
                [attribute]: {
                  ...get(state.contentTypesPermissions, [subject, 'attributes', attribute], {}),
                  actions: [permissionAction],
                },
              },
            };
          }
        } else {
          draftState.contentTypesPermissions[subject].attributes[attribute].actions = get(
            state.contentTypesPermissions,
            attributeActionPath,
            []
          ).filter(action => action !== permissionAction);
        }

        const willRemoveLastAction = subjectActions === 1 && isExist;

        if (!hasContentTypeAction && !isExist) {
          draftState.contentTypesPermissions[subject].contentTypeActions = {
            ...get(state.contentTypesPermissions, [subject, 'contentTypeActions'], {}),
            [permissionAction]: true,
          };
        }

        if (hasContentTypeAction && willRemoveLastAction) {
          draftState.contentTypesPermissions[subject].contentTypeActions = {
            ...get(state.contentTypesPermissions, [subject, 'contentTypeActions'], {}),
            [permissionAction]: false,
          };
        }

        break;
      }
      case 'COLLAPSE_PATH': {
        const { index, value } = action;

        if (state.collapsePath[index] === value) {
          draftState.collapsePath = state.collapsePath.slice().splice(0, index);
        } else {
          draftState.collapsePath = [...state.collapsePath.slice().splice(0, index), value];
        }
        break;
      }
      // This reducer action is used to enable/disable a single content type action
      case 'CONTENT_TYPE_ACTION_SELECT': {
        const { subject, action: permissionAction } = action;

        const hasCondition = get(
          state.contentTypesPermissions,
          [subject, 'conditions', permissionAction],
          false
        );
        const contentTypeActions = get(
          state.contentTypesPermissions,
          [subject, 'contentTypeActions'],
          {}
        );

        const contentTypeActionPath = [
          'contentTypesPermissions',
          subject,
          'contentTypeActions',
          permissionAction,
        ];

        if (contentTypeActions[permissionAction]) {
          set(draftState, contentTypeActionPath, false);

          if (hasCondition) {
            delete draftState.contentTypesPermissions[subject].conditions[permissionAction];
          }
        } else {
          set(draftState, contentTypeActionPath, true);
        }

        break;
      }
      // This reducer action is used to handle the global permissions header actions
      case 'GLOBAL_PERMISSIONS_SELECT': {
        const { action: permissionAction, contentTypes, shouldEnable } = action;

        contentTypes.forEach(contentType => {
          const hasCondition = get(
            draftState,
            ['contentTypesPermissions', contentType.uid, 'conditions', permissionAction],
            false
          );

          if (hasCondition && !shouldEnable) {
            delete draftState.contentTypesPermissions[contentType.uid].conditions[permissionAction];
          }

          set(
            draftState,
            ['contentTypesPermissions', contentType.uid, 'contentTypeActions', permissionAction],
            shouldEnable
          );
        });

        break;
      }
      case 'ON_CONTENT_TYPE_CONDITIONS_SELECT': {
        const { subject, conditions } = action;

        draftState.contentTypesPermissions[subject].conditions = conditions;
        break;
      }
      case 'ON_GLOBAL_PUBLISH_ACTION_SELECT': {
        const contentTypesWithPublishAction = action.contentTypes
          .filter(contentType => contentType.schema.options.draftAndPublish === true)
          .map(contentType => contentType.uid);

        contentTypesWithPublishAction.forEach(contentTypeUID => {
          set(
            draftState,
            [
              'contentTypesPermissions',
              contentTypeUID,
              'contentTypeActions',
              'plugins::content-manager.explorer.publish',
            ],
            action.value
          );
        });

        break;
      }
      // This reducer action is used to handle an action of a plugin/setting permission
      case 'ON_PLUGIN_SETTING_ACTION': {
        const { action: permissionAction } = action;
        const permissionIndex = state.pluginsAndSettingsPermissions.findIndex(
          permission => permission.action === permissionAction
        );

        if (permissionIndex === -1) {
          draftState.pluginsAndSettingsPermissions.push({
            action: permissionAction,
            conditions: [],
            fields: null,
            subject: null,
          });
        } else {
          draftState.pluginsAndSettingsPermissions.splice(permissionIndex, 1);
        }

        break;
      }
      // This reducer action is used to handle all actions of a subcategory of a plugin/setting permissions
      case 'ON_PLUGIN_SETTING_SUB_CATEGORY_ACTIONS': {
        const { actions, shouldEnable } = action;

        const actionsToAdd = actions.map(permission => ({
          action: permission.action,
          conditions: [],
          fields: null,
          subject: null,
        }));

        if (!shouldEnable) {
          draftState.pluginsAndSettingsPermissions = differenceWith(
            state.pluginsAndSettingsPermissions,
            actionsToAdd,
            (x, y) => x.action === y.action
          );
        } else {
          draftState.pluginsAndSettingsPermissions = [
            ...differenceWith(
              state.pluginsAndSettingsPermissions,
              actionsToAdd,
              (x, y) => x.action === y.action
            ),
            ...actionsToAdd,
          ];
        }

        break;
      }
      case 'ON_PLUGIN_SETTING_CONDITIONS_SELECT': {
        const { conditions } = action;

        state.pluginsAndSettingsPermissions.forEach((permission, index) => {
          if (conditions[permission.action]) {
            draftState.pluginsAndSettingsPermissions[index].conditions =
              conditions[permission.action];
          }
        });

        break;
      }
      case 'ON_RESET': {
        draftState.contentTypesPermissions = state.initialData.contentTypesPermissions;
        draftState.pluginsAndSettingsPermissions = state.initialData.pluginsAndSettingsPermissions;
        break;
      }
      case 'ON_SUBMIT_SUCCEEDED': {
        draftState.initialData.contentTypesPermissions = state.contentTypesPermissions;
        draftState.initialData.pluginsAndSettingsPermissions = state.pluginsAndSettingsPermissions;
        break;
      }
      case 'SELECT_ACTION': {
        const { attribute, subject, action: permissionAction } = action;
        const attributeActionPath = [
          'contentTypesPermissions',
          subject,
          'attributes',
          attribute,
          'actions',
        ];
        const existingActions = get(state, attributeActionPath, []);
        const shouldEnable =
          existingActions.findIndex(action => action === permissionAction) === -1;
        const actionsToSet = shouldEnable
          ? [...existingActions, permissionAction]
          : existingActions.filter(action => action !== permissionAction);

        set(draftState, attributeActionPath, actionsToSet);

        const hasCondition = get(
          current(draftState),
          ['contentTypesPermissions', subject, 'conditions', permissionAction],
          false
        );
        const shouldRemoveCondition =
          hasCondition &&
          !shouldEnable &&
          getAttributePermissionsSizeByContentTypeAction(
            current(draftState.contentTypesPermissions),
            subject,
            permissionAction
          ) === 0;

        if (shouldRemoveCondition) {
          delete draftState.contentTypesPermissions[subject].conditions[permissionAction];
        }
        break;
      }
      // This reducer action is used to enable/disable all actions for the payload attributes
      case 'SET_ATTRIBUTES_PERMISSIONS': {
        const { attributes, action: permissionAction, shouldEnable } = action;

        attributes.forEach(({ contentTypeUid, attributeName }) => {
          const pathToAttributeActions = [
            'contentTypesPermissions',
            contentTypeUid,
            'attributes',
            attributeName,
            'actions',
          ];

          const existingActions = get(draftState, pathToAttributeActions, []);

          set(
            draftState,
            pathToAttributeActions,
            shouldEnable
              ? Array.from(new Set([...existingActions, permissionAction]))
              : existingActions.filter(action => action !== permissionAction)
          );
        });

        if (!shouldEnable) {
          Object.keys(state.contentTypesPermissions).forEach(contentTypeUid => {
            const hasCondition = get(
              state,
              ['contentTypesPermissions', contentTypeUid, 'conditions', permissionAction],
              false
            );

            if (hasCondition) {
              delete draftState.contentTypesPermissions[contentTypeUid].conditions[
                permissionAction
              ];
            }
          });
        }

        break;
      }
      case 'SELECT_MULTIPLE_ATTRIBUTE': {
        const { attributes, subject, shouldEnable, action: permissionAction } = action;

        const hasCondition = get(
          draftState,
          ['contentTypesPermissions', subject, 'conditions', permissionAction],
          false
        );

        attributes.forEach(attribute => {
          const attributeActionPath = [
            'contentTypesPermissions',
            subject,
            'attributes',
            attribute.attributeName,
            'actions',
          ];
          const existingActions = get(state, attributeActionPath, []);
          const actionsToSet = shouldEnable
            ? Array.from(new Set([...existingActions, permissionAction]))
            : existingActions.filter(action => action !== permissionAction);

          set(draftState, attributeActionPath, actionsToSet);
        });

        const shouldRemoveCondition =
          hasCondition &&
          !shouldEnable &&
          getAttributePermissionsSizeByContentTypeAction(
            current(draftState.contentTypesPermissions),
            subject,
            permissionAction
          ) === 0;

        if (shouldRemoveCondition) {
          delete draftState.contentTypesPermissions[subject].conditions[permissionAction];
        }
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
