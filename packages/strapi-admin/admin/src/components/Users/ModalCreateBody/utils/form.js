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
};

export default form;
