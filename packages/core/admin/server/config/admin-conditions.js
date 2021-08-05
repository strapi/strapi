'use strict';

module.exports = {
  conditions: [
    {
      displayName: 'Is creator',
      name: 'is-creator',
      plugin: 'admin',
      handler: user => ({ 'created_by.id': user.id }),
    },
    {
      displayName: 'Has same role as creator',
      name: 'has-same-role-as-creator',
      plugin: 'admin',
      handler: user => ({
        'created_by.roles': {
          $elemMatch: {
            id: {
              $in: user.roles.map(r => r.id),
            },
          },
        },
      }),
    },
  ],
};
