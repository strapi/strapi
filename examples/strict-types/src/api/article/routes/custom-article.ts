export default {
  routes: [
    {
      method: 'GET',
      path: '/articles/titles',
      handler: 'api::article.article.titles',
    },
  ],
};
