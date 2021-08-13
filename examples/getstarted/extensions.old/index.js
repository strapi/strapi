'use strict';

module.exports = ({ env }) => ({
  'users-permissions': {
    contentTypes: {
      users: {
        schema: 'users-permissions/models/user.json',
      },
    },
  },
});
