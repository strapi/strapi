/* eslint-disable indent */
/* eslint-disable consistent-return */
import produce from 'immer';
import { get, set } from 'lodash';

import { staticAttributeActions, getAttributePermissionsSizeByContentTypeAction } from './utils';
import generateContentTypeActions from './utils/generateContentTypeActions';

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
        const { attributes, action: permissionAction, hasContentTypeAction, shouldEnable } = action;

        const setActions = (contentTypeUid, attribute) => {
          const attributeActions = get(
            state.permissions,
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
                  ...get(state.permissions, [current.contentTypeUid, 'attributes', current], {}),
                  actions: setActions(current.contentTypeUid, current),
                },
              },
              contentTypeActions: hasContentTypeAction
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
          get(state.permissions, [subject, 'attributes', attribute, 'actions'], []).length ===
          staticAttributeActions.length;

        let attributesToSet = {};

        if (isAll) {
          set(attributesToSet, [attribute, 'actions'], []);
        } else {
          set(attributesToSet, [attribute, 'actions'], staticAttributeActions);
        }

        const subjectPermissions = {
          ...get(state.permissions, [subject, 'attributes'], {}),
          ...attributesToSet,
        };

        const existingContentTypeActions = get(
          state.permissions,
          [subject, 'contentTypeActions'],
          {}
        );
        const permissionsLayout = get(state.permissionsLayout, ['sections', 'contentTypes'], []);

        draftState.permissions[subject] = {
          attributes: subjectPermissions,
          contentTypeActions: generateContentTypeActions(
            subjectPermissions,
            existingContentTypeActions,
            permissionsLayout
          ),
        };

        break;
      }
      // This reducer action is used to enable/disable a single attribute action
      case 'ATTRIBUTE_PERMISSION_SELECT': {
        const { subject, action: permissionAction, attribute } = action;
        const attributeActions = get(
          state.permissions,
          [subject, 'attributes', attribute, 'actions'],
          []
        );
        const subjectActions = getAttributePermissionsSizeByContentTypeAction(
          state.permissions,
          subject,
          permissionAction
        );
        const hasContentTypeAction = get(
          state.permissions,
          [subject, 'contentTypeActions', permissionAction],
          false
        );

        const isExist = attributeActions.includes(permissionAction);

        if (!isExist) {
          if (attributeActions.length > 0) {
            draftState.permissions[subject].attributes[attribute].actions.push(permissionAction);
          } else {
            draftState.permissions[subject] = {
              ...get(state.permissions, [subject], {}),
              attributes: {
                ...get(state.permissions, [subject, 'attributes'], {}),
                [attribute]: {
                  ...get(state.permissions, [subject, 'attributes', attribute], {}),
                  actions: [permissionAction],
                },
              },
            };
          }
        } else {
          draftState.permissions[subject].attributes[attribute].actions = get(
            state.permissions,
            [subject, 'attributes', attribute, 'actions'],
            []
          ).filter(action => action !== permissionAction);
        }

        const willRemoveLastAction = subjectActions === 1 && isExist;

        if (!hasContentTypeAction && !isExist) {
          draftState.permissions[subject].contentTypeActions = {
            ...get(state.permissions, [subject, 'contentTypeActions'], {}),
            [permissionAction]: true,
          };
        }

        if (hasContentTypeAction && willRemoveLastAction) {
          draftState.permissions[subject].contentTypeActions = {
            ...get(state.permissions, [subject, 'contentTypeActions'], {}),
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
          state.permissions,
          [subject, 'contentTypeActions', permissionAction],
          false
        );
        let attributesPermissions = attributes.reduce((acc, attribute) => {
          return {
            ...acc,
            [attribute.attributeName]: {
              ...get(state.permissions, [subject, 'attributes', attribute.attributeName], {}),
              actions: Array.from(
                new Set([
                  ...get(
                    state.permissions,
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
                  ...get(state.permissions, [subject, 'attributes', attribute.attributeName], {}),
                  actions: [
                    ...get(
                      state.permissions,
                      [subject, 'attributes', attribute.attributeName, 'actions'],
                      []
                    ).filter(action => action !== permissionAction),
                  ],
                },
              };
            }, {});
        }

        draftState.permissions[subject] = {
          ...state.permissions[subject],
          attributes: {
            ...get(state.permissions, [subject, 'attributes'], {}),
            ...attributesPermissions,
          },
          ...(hasContentTypeAction || !existingContentTypeAction
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
        const { subject, attributes, shouldEnable, shouldSetAllContentTypes } = action;
        const staticActionsName = get(
          state.permissionsLayout,
          ['sections', 'contentTypes'],
          []
        ).map(contentTypeAction => contentTypeAction.action);

        let attributesActions = attributes.reduce((acc, attribute) => {
          return {
            ...get(state.permissions, [subject, 'attributes'], {}),
            ...acc,
            [attribute.attributeName]: {
              ...get(state.permissions, [subject, 'attributes', attribute.attributeName], {}),
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
          state.permissions,
          [subject, 'contentTypeActions'],
          {}
        );
        const permissionsLayout = get(state.permissionsLayout, ['sections', 'contentTypes'], []);

        const contentTypeActions = shouldSetAllContentTypes
          ? contentTypeLayoutAction
          : generateContentTypeActions(
              attributesActions,
              existingContentTypeActions,
              permissionsLayout
            );

        draftState.permissions[subject] = {
          ...get(state.permissions, [subject], {}),
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
