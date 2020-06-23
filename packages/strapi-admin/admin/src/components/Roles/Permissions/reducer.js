/* eslint-disable indent */
/* eslint-disable consistent-return */
import produce from 'immer';
import { get } from 'lodash';

import { staticAttributeActions } from './utils';

export const initialState = {
  collapsePath: [],
  permissionsLayout: {},
  permissions: {},
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
        const { attributes, action: permissionAction, contentTypeAction, shouldEnable } = action;

        const actionsToSet = (contentTypeUid, attribute) => {
          const attributeActions = get(
            state.permissions,
            [contentTypeUid, attribute.attributeName, 'actions'],
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
              [current.attributeName]: {
                ...get(state.permissions, [current.contentTypeUid, current], {}),
                actions: actionsToSet(current.contentTypeUid, current),
              },
              contentTypeActions: contentTypeAction
                ? {
                    ...get(state.permissions, [current.contentTypeUid, 'contentTypeActions'], {}),
                    [permissionAction]: shouldEnable,
                  }
                : get(state.permissions, [current.contentTypeUid, 'contentTypeActions'], {}),
            },
          };
        }, state.permissions);

        draftState.permissions = permissions;
        break;
      }
      // This reducer action is used to enable/disable a single attribute action
      case 'ALL_ATTRIBUTE_ACTIONS_SELECT': {
        const { subject, attribute } = action;
        const isAll =
          get(state.permissions, [subject, attribute, 'actions'], []).length ===
          staticAttributeActions.length;

        if (isAll) {
          draftState.permissions[subject][attribute].actions = [];
        } else {
          draftState.permissions = {
            ...draftState.permissions,
            [subject]: {
              ...draftState.permissions[subject],
              [attribute]: {
                actions: staticAttributeActions,
              },
            },
          };
        }
        break;
      }
      // This reducer action is used to enable/disable a single attribute action
      case 'ATTRIBUTE_PERMISSION_SELECT': {
        const { subject, action: permissionAction, attribute } = action;
        const attributeActions = get(state.permissions, [subject, attribute, 'actions'], []);

        const isExist = attributeActions.includes(permissionAction);

        if (!isExist) {
          if (attributeActions.length > 0) {
            draftState.permissions[subject][attribute].actions.push(permissionAction);
          } else {
            draftState.permissions[subject] = {
              ...get(state.permissions, [subject], {}),
              [attribute]: {
                ...get(state.permissions, [subject, attribute], {}),
                actions: [permissionAction],
              },
            };
          }
        } else {
          draftState.permissions[subject][attribute].actions = get(
            state.permissions,
            [subject, attribute, 'actions'],
            []
          ).filter(action => action !== permissionAction);
        }

        break;
      }
      // This reducer action is used to enable/disable
      // the content type attributes permissions for an action
      case 'CONTENT_TYPE_ATTRIBUTES_ACTION_SELECT': {
        const {
          attributes,
          subject,
          contentTypeAction,
          action: permissionAction,
          shouldEnable,
        } = action;
        let attributesPermissions = attributes.reduce((acc, attribute) => {
          return {
            ...acc,
            [attribute.attributeName]: {
              ...get(state.permissions, [subject, attribute.attributeName], {}),
              actions: Array.from(
                new Set([
                  ...get(state.permissions, [subject, attribute.attributeName, 'actions'], []),
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
                  ...get(state.permissions, [subject, attribute.attributeName], {}),
                  actions: [
                    ...get(
                      state.permissions,
                      [subject, attribute.attributeName, 'actions'],
                      []
                    ).filter(action => action !== permissionAction),
                  ],
                },
              };
            }, {});
        }

        draftState.permissions[subject] = {
          ...state.permissions[subject],
          ...attributesPermissions,
          ...(contentTypeAction
            ? {
                contentTypeActions: {
                  ...get(state.permissions, [subject, 'contentTypeActions'], {}),
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

        const contentTypeActions = get(state.permissions, [subject, 'contentTypeActions'], {});

        if (contentTypeActions[permissionAction]) {
          draftState.permissions[subject].contentTypeActions = {
            ...contentTypeActions,
            [permissionAction]: false,
          };
        } else {
          draftState.permissions = {
            ...state.permissions,
            [subject]: {
              ...state.permissions[subject],
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
        const { subject, attributes, shouldEnable } = action;
        const staticActionsName = get(
          state.permissionsLayout,
          ['sections', 'contentTypes'],
          []
        ).map(contentTypeAction => contentTypeAction.action);
        let permissionsToSet = attributes.reduce((acc, attribute) => {
          return {
            ...acc,
            [attribute.attributeName]: {
              ...get(state.permissions, [subject, attribute.attributeName], {}),
              actions: !attribute.required && !shouldEnable ? [] : staticAttributeActions,
            },
          };
        }, {});
        const contentTypeActions = staticActionsName.reduce((acc, current) => {
          return {
            ...acc,
            [current]: shouldEnable,
          };
        }, {});

        draftState.permissions[subject] = {
          ...get(state.permissions, [subject]),
          ...permissionsToSet,
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
              ...state.permissions[current.uid],
              contentTypeActions: {
                ...get(state.permissions, [current.uid, 'contentTypeActions'], {}),
                [permissionAction]: shouldEnable,
              },
            },
          };
        }, {});
        /* eslint-enable indent */

        draftState.permissions = {
          ...state.permissions,
          ...permissions,
        };
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
