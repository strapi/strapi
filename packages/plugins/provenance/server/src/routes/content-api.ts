export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/entries/:uid/:documentId',
      handler: 'entries.findPublished',
    },
  ],
};
