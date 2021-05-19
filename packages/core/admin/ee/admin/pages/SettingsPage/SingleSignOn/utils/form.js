const form = {
  autoRegister: {
    autoFocus: false,
    label: 'Settings.sso.form.registration.label',
    description: { id: 'Settings.sso.form.registration.description' },
    type: 'bool',
    validations: {},
    size: {
      xs: '12',
      md: '6',
    },
  },
  defaultRole: {
    autoFocus: false,
    label: 'Settings.sso.form.defaultRole.label',
    description: { id: 'Settings.sso.form.defaultRole.description' },
    notAllowedDescription: { id: 'Settings.sso.form.defaultRole.description-not-allowed' },
    type: 'select',
    validations: {},
    options: [],
    size: {
      xs: '12',
      md: '6',
    },
  },
};

export default form;
