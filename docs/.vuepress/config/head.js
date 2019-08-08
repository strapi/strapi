const author = 'Strapi';
const url = 'https://strapi.io/documentation/';
const ogprefix = 'og: http://ogp.me/ns#';
const color = '#2F80ED';

module.exports = ({ title, description }) => {
  return [
    ['link', { rel: 'icon', href: `/rocket.png` }],
    ['meta', { name: 'theme-color', content: color }],
    ['meta', { prefix: ogprefix, property: 'og:title', content: title }],
    ['meta', { prefix: ogprefix, property: 'twitter:title', content: title }],
    ['meta', { prefix: ogprefix, property: 'og:type', content: 'article' }],
    ['meta', { prefix: ogprefix, property: 'og:url', content: url }],
    [
      'meta',
      { prefix: ogprefix, property: 'og:description', content: description },
    ],
    [
      'meta',
      { prefix: ogprefix, property: 'og:image', content: `${url}rocket.png` },
    ],
    [
      'meta',
      { prefix: ogprefix, property: 'og:article:author', content: author },
    ],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    [
      'meta',
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
    ],
    ['meta', { name: 'msapplication-TileImage', content: '/rocket.png' }],
    ['meta', { name: 'msapplication-TileColor', content: color }],
  ];
};
