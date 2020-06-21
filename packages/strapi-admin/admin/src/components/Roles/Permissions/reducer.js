/* eslint-disable indent */
/* eslint-disable consistent-return */
import produce from 'immer';
import { get, difference } from 'lodash';

import { getAttributesToDisplay } from '../../../utils';
import { isAttributeAction, staticAttributeActions } from './utils';

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
      case 'SET_ATTRIBUTES_PERMISSIONS': {
        const { attributes, action: permissionAction, shouldEnable } = action;
        const attributesToSet =
          !shouldEnable && permissionAction
            ? attributes.filter(attribute => !attribute.required)
            : attributes;

        const actionsToSet = (contentTypeUid, attributeName) => {
          if (shouldEnable) {
            if (permissionAction) {
              return Array.from(
                new Set([
                  ...get(state.permissions, [contentTypeUid, attributeName, 'actions'], []),
                  permissionAction,
                ])
              );
            }

            return staticAttributeActions;
          }

          return get(state.permissions, [contentTypeUid, attributeName, 'actions'], []).filter(
            action => action !== permissionAction
          );
        };

        const permissions = attributesToSet.reduce((acc, current) => {
          return {
            ...acc,
            [current.contentTypeUid]: {
              ...acc[current.contentTypeUid],
              [current.attributeName]: {
                ...get(state.permissions, [current.contentTypeUid, current.attributeName], {}),
                actions: actionsToSet(current.contentTypeUid, current.attributeName),
              },
            },
          };
        }, state.permissions);

        draftState.permissions = permissions;
        break;
      }
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
      case 'CONTENT_TYPE_ATTRIBUTES_ACTION_SELECT': {
        const { attributes, subject, action: permissionAction, shouldEnable } = action;

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
        };

        break;
      }
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
      case 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT': {
        const { subject, attributes, shouldEnable, addContentTypeActions } = action;
        const staticActionsName = get(
          state.permissionsLayout,
          ['sections', 'contentTypes'],
          []
        ).map(contentTypeAction => contentTypeAction.action);
        const onlyContentTypeActions = difference(staticActionsName, staticAttributeActions);
        let permissionsToSet = attributes.reduce((acc, attribute) => {
          return {
            ...acc,
            [attribute.attributeName]: {
              ...get(state.permissions, [subject, attribute.attributeName], {}),
              actions: !attribute.required && !shouldEnable ? [] : staticAttributeActions,
            },
          };
        }, {});
        const contentTypeActions = onlyContentTypeActions.reduce((acc, current) => {
          return {
            ...acc,
            [current]: shouldEnable,
          };
        }, {});

        draftState.permissions[subject] = {
          ...get(state.permissions, [subject]),
          ...permissionsToSet,
          ...(addContentTypeActions ? { contentTypeActions } : null),
        };
        break;
      }
      case 'GLOBAL_PERMISSIONS_SELECT': {
        const { action: permissionAction, contentTypes, shouldEnable } = action;

        const shouldSetAttributesActions = isAttributeAction(permissionAction);

        /* eslint-disable indent */
        const addAttributesMissingActions = contentType => {
          return getAttributesToDisplay(contentType)
            .filter(attribute => !attribute.required)
            .reduce((acc, current) => {
              return {
                ...acc,
                [current.attributeName]: {
                  actions: shouldEnable
                    ? Array.from(
                        new Set([
                          ...get(
                            state.permissions,
                            [contentType.uid, current.attributeName, 'actions'],
                            []
                          ),
                          permissionAction,
                        ])
                      )
                    : get(
                        state.permissions,
                        [contentType.uid, current.attributeName, 'actions'],
                        []
                      ).filter(action => action !== permissionAction),
                },
              };
            }, {});
        };

        const permissions = contentTypes.reduce((acc, current) => {
          return {
            ...acc,
            [current.uid]: {
              ...state.permissions[current.uid],
              ...(shouldSetAttributesActions
                ? addAttributesMissingActions(current)
                : {
                    contentTypeActions: {
                      ...get(state.permissions, [current.uid, 'contentTypeActions'], {}),
                      [permissionAction]: shouldEnable,
                    },
                  }),
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
