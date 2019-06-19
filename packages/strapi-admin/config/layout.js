module.exports = {
  administrator: {
    actions: {
      create: 'Admin.create',
      update: 'Admin.update',
    },
    attributes: {
      username: {
        className: 'col-md-6',
      },
      email: {
        className: 'col-md-6',
      },
      resetPasswordToken: {
        className: 'd-none',
      },
    },
  },
};
