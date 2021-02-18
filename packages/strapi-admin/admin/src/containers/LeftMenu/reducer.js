/* eslint-disable consistent-return */
import produce from 'immer';
import { set } from 'lodash';
import { SETTINGS_BASE_URL } from '../../config';
import adminPermissions from '../../permissions';

const initialState = {
  collectionTypesSectionLinks: [],
  generalSectionLinks: [
    {
      icon: 'list',
      label: 'app.components.LeftMenuLinkContainer.listPlugins',
      destination: '/list-plugins',
      isDisplayed: false,
      permissions: adminPermissions.marketplace.main,
      notificationsCount: 0,
    },
    {
      icon: 'shopping-basket',
      label: 'app.components.LeftMenuLinkContainer.installNewPlugin',
      destination: '/marketplace',
      isDisplayed: false,
      permissions: adminPermissions.marketplace.main,
      notificationsCount: 0,
    },
    {
      icon: 'cog',
      label: 'app.components.LeftMenuLinkContainer.settings',
      isDisplayed: false,
      destination: SETTINGS_BASE_URL,
      // Permissions of this link are retrieved in the init phase
      // using the settings menu
      permissions: [],
      notificationsCount: 0,
    },
  ],
  singleTypesSectionLinks: [],
  pluginsSectionLinks: [],
  isLoading: true,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_MODELS_SUCCEEDED': {
        Object.keys(action.data).forEach(modelType => {
          set(draftState, [modelType], action.data[modelType]);
        });
        break;
      }
      case 'SET_LINK_PERMISSIONS': {
        Object.keys(action.data).forEach(sectionName => {
          const sectionData = action.data[sectionName];

          sectionData.forEach(result => {
            set(draftState, [sectionName, result.index, 'isDisplayed'], result.hasPermission);
          });
        });
        break;
      }
      case 'TOGGLE_IS_LOADING': {
        draftState.isLoading = false;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
