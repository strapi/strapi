'use strict';

module.exports = {
  canConfigure({ userAbility, contentType }) {
    const action =
      contentType.kind === 'singleType'
        ? 'plugins::content-manager.single-types.configure-view'
        : 'plugins::content-manager.collection-types.configure-view';

    return userAbility.can(action);
  },
};
