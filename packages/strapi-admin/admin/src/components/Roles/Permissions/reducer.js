/* eslint-disable indent */
/* eslint-disable consistent-return */
import produce from 'immer';
import { get, set, differenceWith } from 'lodash';

import { staticAttributeActions, getAttributePermissionsSizeByContentTypeAction } from './utils';
import generateContentTypeActions from './utils/generateContentTypeActions';

export const initialState = {
  collapsePath: [],
  permissionsLayout: {},
  contentTypesPermissions: {},
  pluginsAndSettingsPermissions: [],
  isSuperAdmin: false,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'COLLAPSE_PATH': {
        const { index, value } = action;

        if (state.collapsePath[index] === value) {
          draftState.collapsePath = state.collapsePath.slice().splice(0, index);
        } else {
          draftState.collapsePath = [...state.collapsePath.slice().splice(0, index), value];
        }
        break;
      }
      // This reducer action is used to enable/disable all actions for the payload attributes
      case 'SET_ATTRIBUTES_PERMISSIONS': {
        const { attributes, action: permissionAction, hasContentTypeAction, shouldEnable } = action;

        const setActions = (contentTypeUid, attribute) => {
          const attributeActions = get(
            state.contentTypesPermissions,
            [contentTypeUid, 'attributes', attribute.attributeName, 'actions'],
            []
          );

          if (shouldEnable) {
            if (permissionAction) {
              return Array.from(new Set([...attributeActions, permissionAction]));
            }

            return staticAttributeActions;
          }

          // Don't remove an action of a required field
          return !attribute.required
            ? attributeActions.filter(action => action !== permissionAction)
            : attributeActions;
        };

        const permissions = attributes.reduce((acc, current) => {
          return {
            ...acc,
            [current.contentTypeUid]: {
              ...acc[current.contentTypeUid],
              attributes: {
                ...get(acc, [current.contentTypeUid, 'attributes'], {}),
                [current.attributeName]: {
                  ...get(
                    state.contentTypesPermissions,
                    [current.contentTypeUid, 'attributes', current],
                    {}
                  ),
                  actions: setActions(current.contentTypeUid, current),
                },
              },
              contentTypeActions: hasContentTypeAction
                ? {
                    ...get(
                      state.contentTypesPermissions,
                      [current.contentTypeUid, 'contentTypeActions'],
                      {}
                    ),
                    [permissionAction]: shouldEnable,
                  }
                : get(
                    state.contentTypesPermissions,
                    [current.contentTypeUid, 'contentTypeActions'],
                    {}
                  ),
            },
          };
        }, state.contentTypesPermissions);

        draftState.contentTypesPermissions = permissions;
        break;
      }
      // This reducer action is used to enable/disable a single attribute action
      case 'ALL_ATTRIBUTE_ACTIONS_SELECT': {
        const { subject, attribute, shouldAddDeleteAction } = action;

        const isAll =
          get(state.contentTypesPermissions, [subject, 'attributes', attribute, 'actions'], [])
            .length === staticAttributeActions.length;

        let attributesToSet = {};

        if (isAll) {
          set(attributesToSet, [attribute, 'actions'], []);
        } else {
          set(attributesToSet, [attribute, 'actions'], staticAttributeActions);
        }

        const subjectPermissions = {
          ...get(state.contentTypesPermissions, [subject, 'attributes'], {}),
          ...attributesToSet,
        };

        const existingContentTypeActions = get(
          state.contentTypesPermissions,
          [subject, 'contentTypeActions'],
          {}
        );

        draftState.contentTypesPermissions[subject] = {
          ...get(state.contentTypesPermissions, [subject], {}),
          attributes: subjectPermissions,
          contentTypeActions: generateContentTypeActions(
            subjectPermissions,
            existingContentTypeActions,
            shouldAddDeleteAction
          ),
        };

        break;
      }
      // This reducer action is used to enable/disable a single attribute action
      case 'ATTRIBUTE_PERMISSION_SELECT': {
        const { subject, action: permissionAction, attribute } = action;
        const attributeActions = get(
          state.contentTypesPermissions,
          [subject, 'attributes', attribute, 'actions'],
          []
        );
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
            [subject, 'attributes', attribute, 'actions'],
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
      // This reducer action is used to enable/disable
      // the content type attributes permissions for an action
      case 'ON_ATTRIBUTES_SELECT': {
        const {
          attributes,
          subject,
          hasContentTypeAction,
          action: permissionAction,
          shouldEnable,
        } = action;
        const existingContentTypeAction = get(
          state.contentTypesPermissions,
          [subject, 'contentTypeActions', permissionAction],
          false
        );
        let attributesPermissions = attributes.reduce((acc, attribute) => {
          return {
            ...acc,
            [attribute.attributeName]: {
              ...get(
                state.contentTypesPermissions,
                [subject, 'attributes', attribute.attributeName],
                {}
              ),
              actions: Array.from(
                new Set([
                  ...get(
                    state.contentTypesPermissions,
                    [subject, 'attributes', attribute.attributeName, 'actions'],
                    []
                  ),
                  permissionAction,
                ])
              ),
            },
          };
        }, {});

        if (!shouldEnable) {
          attributesPermissions = attributes
            .filter(attribute => !attribute.required)
            .reduce((acc, attribute) => {
              return {
                ...acc,
                [attribute.attributeName]: {
                  ...get(
                    state.contentTypesPermissions,
                    [subject, 'attributes', attribute.attributeName],
                    {}
                  ),
                  actions: [
                    ...get(
                      state.contentTypesPermissions,
                      [subject, 'attributes', attribute.attributeName, 'actions'],
                      []
                    ).filter(action => action !== permissionAction),
                  ],
                },
              };
            }, {});
        }

        draftState.contentTypesPermissions[subject] = {
          ...state.contentTypesPermissions[subject],
          attributes: {
            ...get(state.contentTypesPermissions, [subject, 'attributes'], {}),
            ...attributesPermissions,
          },
          ...(hasContentTypeAction || !existingContentTypeAction
            ? {
                contentTypeActions: {
                  ...get(state.contentTypesPermissions, [subject, 'contentTypeActions'], {}),
                  [permissionAction]: shouldEnable,
                },
              }
            : null),
        };

        break;
      }
      // This reducer action is used to enable/disable a single content type action
      case 'CONTENT_TYPE_ACTION_SELECT': {
        const { subject, action: permissionAction } = action;

        const contentTypeActions = get(
          state.contentTypesPermissions,
          [subject, 'contentTypeActions'],
          {}
        );

        if (contentTypeActions[permissionAction]) {
          draftState.contentTypesPermissions[subject].contentTypeActions = {
            ...contentTypeActions,
            [permissionAction]: false,
          };
        } else {
          draftState.contentTypesPermissions = {
            ...state.contentTypesPermissions,
            [subject]: {
              ...state.contentTypesPermissions[subject],
              contentTypeActions: {
                ...contentTypeActions,
                [permissionAction]: true,
              },
            },
          };
        }

        break;
      }
      // This reducer action is used to enable/disable all
      // content type attributes actions recursively
      case 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT': {
        const {
          subject,
          attributes,
          shouldEnable,
          shouldSetAllContentTypes,
          shouldAddDeleteAction,
        } = action;
        const staticActionsName = get(
          state.permissionsLayout,
          ['sections', 'contentTypes'],
          []
        ).map(contentTypeAction => contentTypeAction.action);

        let attributesActions = attributes.reduce((acc, attribute) => {
          return {
            ...get(state.contentTypesPermissions, [subject, 'attributes'], {}),
            ...acc,
            [attribute.attributeName]: {
              ...get(
                state.contentTypesPermissions,
                [subject, 'attributes', attribute.attributeName],
                {}
              ),
              actions: !attribute.required && !shouldEnable ? [] : staticAttributeActions,
            },
          };
        }, {});
        const contentTypeLayoutAction = staticActionsName.reduce((acc, current) => {
          return {
            ...acc,
            [current]: shouldEnable,
          };
        }, {});

        const existingContentTypeActions = get(
          state.contentTypesPermissions,
          [subject, 'contentTypeActions'],
          {}
        );

        const contentTypeActions = shouldSetAllContentTypes
          ? contentTypeLayoutAction
          : generateContentTypeActions(
              attributesActions,
              existingContentTypeActions,
              shouldAddDeleteAction
            );

        draftState.contentTypesPermissions[subject] = {
          ...get(state.contentTypesPermissions, [subject], {}),
          attributes: attributesActions,
          contentTypeActions,
        };
        break;
      }
      // This reducer action is used to handle the global permissions header actions
      case 'GLOBAL_PERMISSIONS_SELECT': {
        const { action: permissionAction, contentTypes, shouldEnable } = action;
        const permissions = contentTypes.reduce((acc, current) => {
          return {
            ...acc,
            [current.uid]: {
              ...state.contentTypesPermissions[current.uid],
              contentTypeActions: {
                ...get(state.contentTypesPermissions, [current.uid, 'contentTypeActions'], {}),
                [permissionAction]: shouldEnable,
              },
            },
          };
        }, {});
        /* eslint-enable indent */

        draftState.contentTypesPermissions = {
          ...state.contentTypesPermissions,
          ...permissions,
        };
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
            // For the moment, this will reset the conditions object
            // but it will be changed after the conditions US
            // TODO : To fix for the conditions US
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
          // For the moment, this will reset the conditions object
          // but it will be changed after the conditions US
          // TODO : To fix for the conditions US
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
      case 'ON_CONTENT_TYPE_CONDITIONS_SELECT': {
        const { subject, conditions } = action;

        draftState.contentTypesPermissions[subject].conditions = conditions;
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
      default:
        return draftState;
    }
  });

export default reducer;
