module.exports = {
  query: `
    userCustomRoute: String
  `,
  resolver: {
    Mutation: {
      updateUser: {
        description: 'Updates a user',
        policies: ['customPolicy'],
      },
    },
    Query: {
      userCustomRoute: {
        resolver: 'plugin::users-permissions.users-permissions.customRoute',
      },
    },
  },
};
