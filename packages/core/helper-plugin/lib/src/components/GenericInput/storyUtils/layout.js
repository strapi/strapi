const layout = [
  [
    {
      intlLabel: {
        id: 'Auth.form.firstname.label',
        defaultMessage: 'First name',
      },
      name: 'firstname',
      placeholder: {
        id: 'Auth.form.firstname.placeholder',
        defaultMessage: 'e.g. Kai',
      },
      type: 'text',
      size: {
        col: 6,
        xs: 12,
      },
    },
  ],
  [
    {
      intlLabel: {
        id: 'Auth.form.email.label',
        defaultMessage: 'Email',
      },
      name: 'email',
      placeholder: {
        id: 'Auth.form.email.placeholder',
        defaultMessage: 'e.g. kai.doe@strapi.io',
      },
      type: 'email',
      size: {
        col: 6,
        xs: 12,
      },
    },
    {
      intlLabel: {
        id: 'Auth.form.username.label',
        defaultMessage: 'Username',
      },
      name: 'username',
      placeholder: {
        id: 'Auth.form.username.placeholder',
        defaultMessage: 'e.g. Kai_Doe',
      },
      type: 'text',
      size: {
        col: 6,
        xs: 12,
      },
    },
  ],
  [
    {
      intlLabel: {
        id: 'global.password',
        defaultMessage: 'Password',
      },
      name: 'password',
      type: 'password',
      size: {
        col: 6,
        xs: 12,
      },
    },
  ],
  [
    {
      intlLabel: {
        id: 'Auth.form.active.label',
        defaultMessage: 'Boolean: Nullable',
      },
      isNullable: true,
      name: 'isNullable',
      type: 'bool',
      size: {
        col: 2,
        xs: 12,
      },
    },

    {
      intlLabel: {
        id: 'Auth.form.active.label',
        defaultMessage: 'Boolean: Active by default',
      },
      name: 'isActiveByDefault',
      type: 'bool',
      size: {
        col: 2,
        xs: 12,
      },
    },

    {
      intlLabel: {
        id: 'Auth.form.inactive.label',
        defaultMessage: 'Boolean: Inactive by default',
      },
      name: 'isInactiveByDefault',
      type: 'bool',
      size: {
        col: 2,
        xs: 12,
      },
    },

    {
      name: 'private',
      type: 'checkbox',
      size: {
        col: 6,
        xs: 12,
      },
      intlLabel: {
        id: 'form.attribute.item.privateField',
        defaultMessage: 'Private field',
      },
      description: {
        id: 'form.attribute.item.privateField.description',
        defaultMessage: 'This field will not show up in the API response',
      },
    },
    {
      intlLabel: { id: 'meal', defaultMessage: 'meal' },
      name: 'meal',
      type: 'select',
      size: {
        col: 6,
        xs: 12,
      },
      options: [
        {
          key: 'pizza',
          value: 'pizza',
          metadatas: {
            intlLabel: { id: 'pizza-label', defaultMessage: 'Pizza' },
            disabled: false,
            hidden: false,
          },
        },
        {
          key: 'sandwich',
          value: 'sandwich',
          metadatas: {
            intlLabel: { id: 'sandwich-label', defaultMessage: 'Sandwich' },
            disabled: false,
            hidden: false,
          },
        },
      ],
    },
  ],
];

export default layout;
