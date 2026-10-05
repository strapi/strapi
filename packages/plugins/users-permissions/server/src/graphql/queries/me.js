'use strict';

module.exports = () => ({
  type: 'UsersPermissionsMe',

  args: {},

  resolve(parent, args, context) {
    const { user } = context.state;

    if (!user) {
      throw new Error('Authentication requested');
    }

    return user;
  },
});
