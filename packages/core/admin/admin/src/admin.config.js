export default {
  config: {
    auth: {
      logo:
        'https://images.unsplash.com/photo-1593642634367-d91a135587b5?ixid=MnwxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=750&q=80',
    },
    head: {
      favicon:
        'https://images.unsplash.com/photo-1593642634367-d91a135587b5?ixid=MnwxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=750&q=80',
      title: 'Strapi',
    },
    locales: ['fr', 'toto'],
    menu: {
      logo: null,
    },
    theme: {
      main: {
        colors: {},
      },
    },
    translations: {
      fr: {
        'Auth.form.email.label': 'test',
      },
    },
    tutorials: false,
    notifications: { release: false },
  },
  bootstrap() {},
};
