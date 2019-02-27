module.exports = {
  user: {
    actions: {
      create: 'User.create', // Use the User plugin's controller.
      update: 'User.update',
      destroy: 'User.destroy',
      deleteall: 'User.destroyAll',
    },
    attributes: {
      username: {
        className: 'col-md-6'
      },
      email: {
        className: 'col-md-6'
      },
      resetPasswordToken: {
        className: 'd-none'
      },
      role: {
        className: 'd-none'
      }
    }
  }
};
