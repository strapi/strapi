module.exports = {
  query: `
    userCustomRoute: String
  `,
  resolver: {
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
