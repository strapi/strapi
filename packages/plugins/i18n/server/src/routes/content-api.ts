export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/locales',
      handler: 'locales.listLocales',
    },
  ],
};
