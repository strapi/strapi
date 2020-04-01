module.exports = {
  user: {
    actions: {
      create: 'User.create', // Use the User plugin's controller.
      update: 'User.update',
      delete: 'User.destroy',
      deleteall: 'User.destroyAll',
    },
  },
};
