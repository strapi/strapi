const form = {
  firstname: {
    autoFocus: true,
    label: 'Settings.permissions.users.form.firstname',
    placeholder: 'e.g. John',
    type: 'text',
    validations: {
      required: true,
    },
  },
  lastname: {
    label: 'Settings.permissions.users.form.lastname',
    placeholder: 'e.g. Doe',
    type: 'text',
    validations: {
      required: true,
    },
  },
  email: {
    label: 'Settings.permissions.users.form.email',
    placeholder: 'e.g. john.doe@strapi.io',
    type: 'email',
    validations: {
      required: true,
    },
  },
  username: {
    label: 'Auth.form.username.label',
    placeholder: 'e.g. John_Doe',
    type: 'text',
    validations: {},
  },
  password: {
    label: 'Auth.form.password.label',
    type: 'password',
    validations: {},
  },
  confirmPassword: {
    label: 'Auth.form.confirmPassword.label',
    type: 'password',
    validations: {},
  },
};

export default form;
