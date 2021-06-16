/* eslint-disable consistent-return */
import produce from 'immer';
import adminPermissions from '../../permissions';
import { SET_SECTION_LINKS, UNSET_IS_LOADING } from './constants';

const initialState = {
  generalSectionLinks: [
    {
      icon: 'list',
      label: {
        id: 'app.components.LeftMenuLinkContainer.listPlugins',
        defaultMessage: 'Plugins',
      },
      destination: '/list-plugins',
      // TODO
      isDisplayed: false,
      permissions: adminPermissions.marketplace.main,
      notificationsCount: 0,
    },
    {
      icon: 'shopping-basket',
      label: {
        id: 'app.components.LeftMenuLinkContainer.installNewPlugin',
        defaultMessage: 'Marketplace',
      },
      destination: '/marketplace',
      // TODO
      isDisplayed: false,
      permissions: adminPermissions.marketplace.main,
      notificationsCount: 0,
    },
    {
      icon: 'cog',
      label: {
        id: 'app.components.LeftMenuLinkContainer.settings',
        defaultMessage: 'Settings',
      },
      // TODO
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
