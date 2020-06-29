'use strict';

module.exports = {
  conditions: [
    {
      displayName: 'Is Creator',
      name: 'is-creator',
      plugin: 'admin',
      handler: user => ({ created_by: user.id }),
    },
  ],
};
