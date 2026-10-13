// Application code as a strict-off v5 app writes it. Never executed: the harness only type checks it,
// and its diagnostics must match between the baseline and the head checkout.
import type { Core } from '@strapi/strapi';

declare const strapi: Core.Strapi;

export async function registerAction() {
  await strapi.service('admin::permission').actionProvider.register({
    uid: 'read-stats',
    section: 'plugins',
    displayName: 'Read stats',
    pluginName: 'parity',
    category: 'stats',
  });
}

export async function readArticles() {
  const articles = await strapi.documents('api::article.article').findMany({
    fields: ['title', 'views'],
    populate: { author: true },
    filters: { title: { $contains: 'v5' } },
  });

  return articles.map((article) => article.title);
}

export async function uploadFile() {
  return strapi
    .plugin('upload')
    .service('upload')
    .upload({
      data: {},
      files: { filepath: '/tmp/a.png', originalFilename: 'a.png', mimetype: 'image/png', size: 1 },
    });
}

export async function customService() {
  return strapi.service('api::article.article').findPopular();
}

export function readConfig() {
  const port: number = strapi.config.get('server.port');
  const custom = strapi.config.get('plugin::my-plugin.option', 'default');

  return { port, custom };
}
