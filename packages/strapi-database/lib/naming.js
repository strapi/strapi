'use strict';

function nameToUID({ name, isGroup, plugin, isAdmin }) {
  if (isGroup) {
    return `group::${name}`;
  }

  if (plugin) {
    return `plugins::${plugin}.${name}`;
  }

  if (isAdmin) {
    return `admin::${name}`;
  }

  return `app::${name}`;
}

module.exports = {
  nameToUID,
};
