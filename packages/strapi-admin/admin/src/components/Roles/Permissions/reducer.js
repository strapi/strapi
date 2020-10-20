/* eslint-disable indent */
/* eslint-disable consistent-return */
import produce from 'immer';
import { get, set } from 'lodash';

import requiredActions from 'ee_else_ce/components/Roles/Permissions/requiredActions';
import {
  staticAttributeActions,
  contentManagerPermissionPrefix,
  generateContentTypeActions,
} from './utils';

export const initialState = {
  collapsePath: [],
  permissionsLayout: {},
  contentTypesPermissions: {},
  pluginsAndSettingsPermissions: [],
  initialData: {},
  isSuperAdmin: false,
};

// This is the community edition RBAC reducer
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
      // This reducer action is used to enable/disable a single attribute action
      case 'ALL_ATTRIBUTE_ACTIONS_SELECT': {
        const { subject, attribute, shouldAddDeleteAction } = action;

        const isAll =
          get(
            state.contentTypesPermissions,
            [subject, 'attributes', attribute.attributeName, 'actions'],
            []
          ).length === staticAttributeActions.length;

        let attributesToSet = {};

        if (isAll) {
          set(
            attributesToSet,
            [attribute.attributeName, 'actions'],
            attribute.required ? [`${contentManagerPermissionPrefix}.create`] : []
          );
        } else {
          set(attributesToSet, [attribute.attributeName, 'actions'], staticAttributeActions);
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
            state.permissionsLayout.sections.contentTypes,
            shouldAddDeleteAction
          ),
        };

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
        const staticActionsName = get(state.permissionsLayout, ['sections', 'contentTypes'], [])
          .filter(contentTypeAction => contentTypeAction.subjects.includes(subject))
          .map(contentTypeAction => contentTypeAction.action);

        let attributesActions = attributes.reduce((acc, attribute) => {
          let actions = attribute.required ? requiredActions : [];

          if (shouldEnable) {
            actions = staticAttributeActions;
          }

          return {
            ...get(state.contentTypesPermissions, [subject, 'attributes'], {}),
            ...acc,
            [attribute.attributeName]: {
              ...get(
                state.contentTypesPermissions,
                [subject, 'attributes', attribute.attributeName],
                {}
              ),
              actions,
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
              state.permissionsLayout.sections.contentTypes,
              shouldAddDeleteAction
            );

        draftState.contentTypesPermissions[subject] = {
          ...get(state.contentTypesPermissions, [subject], {}),
          attributes: attributesActions,
          contentTypeActions,
        };
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
