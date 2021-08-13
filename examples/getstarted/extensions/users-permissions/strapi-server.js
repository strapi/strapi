// 1 - load original plugin
// 2 - load content types overwrites
// 3 - execute plugin extensions

module.exports = plugin => {
  // extend article content type

  plugin.contentTypes.article.collectionName === 'foo';

  plugin.routes.push({
    method: 'GET',
    handler: 'myCtrl.actionA',
  });

  return plugin;
};
