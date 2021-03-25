/* eslint-disable consistent-return */
import produce from 'immer';
import { SETTINGS_BASE_URL } from '../../config';
import adminPermissions from '../../permissions';
import {
  SET_CT_OR_ST_LINKS,
  SET_SECTION_LINKS,
  TOGGLE_IS_LOADING,
  UNSET_IS_LOADING,
} from './constants';

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

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case SET_CT_OR_ST_LINKS: {
        const { authorizedCtLinks, authorizedStLinks } = action.data;
        draftState.collectionTypesSectionLinks = authorizedCtLinks;
        draftState.singleTypesSectionLinks = authorizedStLinks;
        break;
      }

      case SET_SECTION_LINKS: {
        const { authorizedGeneralLinks, authorizedPluginLinks } = action.data;
        draftState.generalSectionLinks = authorizedGeneralLinks;
        draftState.pluginsSectionLinks = authorizedPluginLinks;
        break;
      }

      case TOGGLE_IS_LOADING: {
        draftState.isLoading = !state.isLoading;
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
