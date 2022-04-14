import theme from './extensions/theme';

type Config = {
  auth: Auth;
  head: {};
  locales: string[];
  menu: {};
  theme: {};
  translations: {};
  tutorials: boolean;
  notifications: {};
};

type Auth = {
  logo: string;
};

const config: Config = {
  auth: {
    logo:
      'https://images.unsplash.com/photo-1593642634367-d91a135587b5?ixid=MnwxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=750&q=80',
  },
  head: {
    favicon:
      'https://images.unsplash.com/photo-1593642634367-d91a135587b5?ixid=MnwxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=750&q=80',
    title: 'Strapi test',
  },
  locales: ['fr'],
  menu: {
    logo:
      'https://images.unsplash.com/photo-1593642634367-d91a135587b5?ixid=MnwxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=750&q=80',
  },
  theme,
  translations: {
    fr: {
      'Auth.form.email.label': 'test',
      Users: 'Utilisateurs',
      City: 'CITY FRENCH',
      // Customize the label of the CM table..
      Id: 'ID french',
    },
  },
  tutorials: false,
  notifications: { release: false },
};

const bootstrap = (app: any) => {
  console.log(app);
};

export default {
  config,
  bootstrap,
};
