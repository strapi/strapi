module.exports = {
  query: `
    userCustomRoute: String
  `,
  resolver: {
    Mutation: {
      // updateUser: {
      //   description: 'Updates a user',
      //   policies: ['customPolicy'],
      //   resolver: 'plugins::users-permissions.user.update',
      // },
    },
    Query: {
      userCustomRoute: {
        resolver: 'plugins::users-permissions.userspermissions.customRoute',
      },
    },
  },
};
