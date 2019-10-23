module.exports = {
  query: `
    userCustomRoute: String
  `,
  resolver: {
    Mutation: {
      updateUser: {
        description: 'Updates a user',
        policies: ['customPolicy'],
        resolver: {
          plugin: 'users-permissions',
          handler: 'User.update',
        },
      },
    },
    Query: {
      userCustomRoute: {
        resolver: {
          plugin: 'users-permissions',
          handler: 'UsersPermissions.customRoute',
        },
      },
    },
  },
};
