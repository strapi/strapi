const form = {
  firstname: {
    autoFocus: true,
    label: 'Settings.permissions.users.form.firstname',
    placeholder: 'e.g. Kai',
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
    placeholder: 'e.g. kai.doe@strapi.io',
    type: 'email',
    validations: {
      required: true,
    },
  },
  username: {
    label: 'Auth.form.username.label',
    placeholder: 'e.g. Kai_Doe',
    type: 'text',
    autoComplete: 'no',
    validations: {},
  },
  password: {
    label: 'Auth.form.password.label',
    type: 'password',
    autoComplete: 'new-password',
    validations: {},
  },
  confirmPassword: {
    label: 'Auth.form.confirmPassword.label',
    type: 'password',
    validations: {},
  },
  isActive: {
    label: 'app.containers.Users.EditPage.form.active.label',
    type: 'bool',
    validations: {},
  },
};

export default form;
