/* eslint-disable consistent-return */
import produce from 'immer';
import adminPermissions from '../../permissions';
import { SET_SECTION_LINKS, UNSET_IS_LOADING } from './constants';

const initialState = {
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
      isDisplayed: true,
      destination: '/settings',
      // Permissions of this link are retrieved in the init phase
      // using the settings menu
      permissions: [],
      notificationsCount: 0,
    },
  ],
  pluginsSectionLinks: [],
  isLoading: true,
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case SET_SECTION_LINKS: {
        const { authorizedGeneralLinks, authorizedPluginLinks } = action.data;
        draftState.generalSectionLinks = authorizedGeneralLinks;
        draftState.pluginsSectionLinks = authorizedPluginLinks;
        break;
      }
      case UNSET_IS_LOADING: {
        draftState.isLoading = false;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
