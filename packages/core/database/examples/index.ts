import type { Strapi } from './typings';

function main(strapi: Strapi) {
  const r = strapi.query('restaurant').findOne({
    select: ['id', 'description'],
    where: {
      $and: [{ id: '1' }],
    },
  });
}
