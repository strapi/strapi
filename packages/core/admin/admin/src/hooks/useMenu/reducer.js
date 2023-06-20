/* eslint-disable consistent-return */
import { Cog, Puzzle, ShoppingCart } from '@strapi/icons';
import produce from 'immer';

const initialState = {
  generalSectionLinks: [
    {
      icon: Puzzle,
      intlLabel: {
        id: 'global.plugins',
        defaultMessage: 'Plugins',
      },
      to: '/list-plugins',
      permissions: 'marketplace',
    },
    {
      icon: ShoppingCart,
      intlLabel: {
        id: 'global.marketplace',
        defaultMessage: 'Marketplace',
      },
      to: '/marketplace',
      permissions: 'marketplace',
    },
    {
      icon: Cog,
      intlLabel: {
        id: 'global.settings',
        defaultMessage: 'Settings',
      },
      to: '/settings',
      // Permissions of this link are retrieved in the init phase
      // using the settings menu
      permissions: false,
      notificationsCount: 0,
    },
  ],
  pluginsSectionLinks: [],
  isLoading: true,
};

const reducer = (state = initialState, action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'SET_SECTION_LINKS': {
        const { authorizedGeneralSectionLinks, authorizedPluginSectionLinks } = action.data;
        draftState.generalSectionLinks = authorizedGeneralSectionLinks;
        draftState.pluginsSectionLinks = authorizedPluginSectionLinks;
        break;
      }
      case 'UNSET_IS_LOADING': {
        draftState.isLoading = false;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
