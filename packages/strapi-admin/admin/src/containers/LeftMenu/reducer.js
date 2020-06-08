/* eslint-disable consistent-return */
import produce from 'immer';
import { set } from 'lodash';
import { SETTINGS_BASE_URL } from '../../config';

const initialState = {
  generalSectionLinks: [
    {
      icon: 'list',
      label: 'app.components.LeftMenuLinkContainer.listPlugins',
      destination: '/list-plugins',
      isDisplayed: false,
      permissions: [
        { action: 'admin::marketplace.read', subject: null },
        { action: 'admin::marketplace.plugins.uninstall', subject: null },
      ],
    },
    {
      icon: 'shopping-basket',
      label: 'app.components.LeftMenuLinkContainer.installNewPlugin',
      destination: '/marketplace',
      isDisplayed: false,
      permissions: [
        { action: 'admin::marketplace.read', subject: null },
        { action: 'admin::marketplace.plugins.install', subject: null },
      ],
    },
    {
      icon: 'cog',
      label: 'app.components.LeftMenuLinkContainer.settings',
      isDisplayed: false,
      destination: SETTINGS_BASE_URL,
      permissions: [
        // webhooks
        { action: 'admin::webhook.create', subject: null },
        { action: 'admin::webhook.read', subject: null },
        { action: 'admin::webhook.update', subject: null },
        { action: 'admin::webhook.delete', subject: null },
        // users
        { action: 'admin::users.create', subject: null },
        { action: 'admin::users.read', subject: null },
        { action: 'admin::users.update', subject: null },
        { action: 'admin::users.delete', subject: null },
        // roles
        { action: 'admin::roles.create', subject: null },
        { action: 'admin::roles.update', subject: null },
        { action: 'admin::roles.read', subject: null },
        { action: 'admin::roles.delete', subject: null },
        // media library
        { action: 'plugins::upload.read', subject: null },
        { action: 'plugins::upload.assets.create', subject: null },
        { action: 'plugins::upload.assets.update', subject: null },
      ],
    },
  ],
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'SET_LINK_PERMISSION': {
        set(draftState, ['generalSectionLinks', action.index, 'isDisplayed'], action.hasPermission);
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
