export default {
  routes: [
    {
      method: 'GET',
      path: '/articles/titles',
      handler: 'api::article.article.titles',
    },
    {
      method: 'GET',
      path: '/articles/latest',
      handler: 'api::article.article.latest',
    },
  ],
};
