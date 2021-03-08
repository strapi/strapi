/* eslint-disable indent */
/* eslint-disable consistent-return */
import produce, { current } from 'immer';
import { get, set } from 'lodash';

import {
  getRecursivePermissionsBySubject,
  isAttributeAction,
  STATIC_ATTRIBUTE_ACTIONS,
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
        const { subject, attribute, shouldEnable } = action;
        const attributePath = [
          'contentTypesPermissions',
          subject,
          'attributes',
          attribute.attributeName,
          'actions',
        ];
        const contentTypeActionPath = ['contentTypesPermissions', subject, 'contentTypeActions'];

        if (shouldEnable) {
          const shouldSetContentTypeActions =
            Object.values(get(state, contentTypeActionPath, {})).filter(Boolean).length === 0;
          const contentTypeActionToSet = get(
            state.permissionsLayout,
            ['sections', 'contentTypes'],
            []
          )
            .filter(
              ({ subjects, action }) => subjects.includes(subject) && !isAttributeAction(action)
            )
            .map(contentTypeAction => contentTypeAction.action);

          if (shouldSetContentTypeActions) {
            contentTypeActionToSet.forEach(action => {
              set(draftState, [...contentTypeActionPath, action], true);
            });
          }
          set(draftState, attributePath, STATIC_ATTRIBUTE_ACTIONS);
        } else {
          set(draftState, attributePath, []);
          const permissionsCount = getRecursivePermissionsBySubject(
            subject,
            current(draftState).contentTypesPermissions
          );

          if (permissionsCount === 0) {
            set(draftState, ['contentTypesPermissions', subject, 'contentTypeActions'], {});
          }
        }

        break;
      }
      // This reducer action is used to enable/disable all
      // content type attributes actions recursively
      case 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT': {
        const { subject, attributes, shouldEnable, shouldSetAllContentTypes } = action;
        const contentTypeActionPath = ['contentTypesPermissions', subject, 'contentTypeActions'];
        const shouldSetContentTypeActions =
          Object.values(get(state, contentTypeActionPath, {})).filter(Boolean).length === 0;

        const staticActionsName = get(state.permissionsLayout, ['sections', 'contentTypes'], [])
          .filter(
            ({ subjects, action }) => subjects.includes(subject) && !isAttributeAction(action)
          )
          .map(contentTypeAction => contentTypeAction.action);

        attributes.forEach(attribute => {
          set(
            draftState,
            ['contentTypesPermissions', subject, 'attributes', attribute.attributeName, 'actions'],
            shouldEnable ? STATIC_ATTRIBUTE_ACTIONS : []
          );
        });

        if (shouldSetAllContentTypes || shouldSetContentTypeActions) {
          staticActionsName.forEach(action => {
            set(
              draftState,
              ['contentTypesPermissions', subject, 'contentTypeActions', action],
              shouldEnable
            );
          });
        }

        const permissionsCount = getRecursivePermissionsBySubject(
          subject,
          current(draftState).contentTypesPermissions
        );

        if (permissionsCount === 0) {
          set(draftState, ['contentTypesPermissions', subject, 'contentTypeActions'], {});
        }

        break;
      }

      case 'SELECT_MULTIPLE_ATTRIBUTE': {
        const { attributes, subject } = action;

        attributes.forEach(attribute => {
          const attributeActionPath = [
            'contentTypesPermissions',
            subject,
            'attributes',
            attribute.attributeName,
            'actions',
          ];

          set(draftState, attributeActionPath, STATIC_ATTRIBUTE_ACTIONS);
        });
        break;
      }
      case 'ON_RESET': {
        const { initialPermissions } = action;
        draftState.contentTypesPermissions = initialPermissions.contentTypesPermissions;
        draftState.pluginsAndSettingsPermissions = initialPermissions.pluginsAndSettingsPermissions;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
