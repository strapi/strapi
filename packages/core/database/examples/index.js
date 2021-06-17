'use strict';

const _ = require('lodash');
const { Database } = require('../lib/index');

const category = {
  singularName: 'category',
  uid: 'category',
  tableName: 'categories',
  attributes: {
    title: {
      type: 'string',
    },
    price: {
      type: 'integer',
      //
      column: {
        // unique: true,
        nonNullable: true,
        unsigned: true,
        defaultTo: 12.0,
      },
    },
    articles: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'article',
      mappedBy: 'category',
      useJoinTable: false,
    },
    compo: {
      type: 'component',
      component: 'compo',
    },
  },
};

const article = {
  singularName: 'article',
  uid: 'article',
  tableName: 'articles',
  attributes: {
    title: {
      type: 'string',
    },
    category: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'category',
      inversedBy: 'articles',
      useJoinTable: false,
    },
    tags: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'tag',
      inversedBy: 'articles',
    },
    compo: {
      type: 'component',
      component: 'compo',
      repeatable: true,
    },
    // cover: {
    //   type: 'media',
    //   single: true,
    // },
    // gallery: {
    //   type: 'media',
    //   multiple: true,
    // },
  },
};

const tags = {
  singularName: 'tag',
  uid: 'tag',
  tableName: 'tags',
  attributes: {
    name: {
      type: 'string',
    },
    articles: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'article',
      mappedBy: 'tag',
    },
  },
};

const compo = {
  singularName: 'compo',
  uid: 'compo',
  tableName: 'compos',
  attributes: {
    key: {
      type: 'string',
    },
    value: {
      type: 'integer',
    },
  },
};

const user = {
  singularName: 'user',
  uid: 'user',
  tableName: 'users',
  attributes: {
    address: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'address',
      inversedBy: 'user',
      // useJoinTable: false,
    },
  },
};

const address = {
  singularName: 'address',
  uid: 'address',
  tableName: 'addresses',
  attributes: {
    name: {
      type: 'string',
    },
    user: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'user',
      mappedBy: 'address',
    },
  },
};

// const orm = new Database({
//   connection: {
//     client: 'sqlite',
//     connection: {
//       filename: 'test.sqlite',
//     },
//     useNullAsDefault: true,
//     debug: true,
//   },
//   models: [category, article],
// });

const file = {
  singularName: 'file',
  uid: 'file',
  tableName: 'files',
  attributes: {
    name: {
      type: 'string',
    },
    alternativeText: {
      type: 'string',
    },
    caption: {
      type: 'string',
    },
    width: {
      type: 'integer',
    },
    height: {
      type: 'integer',
    },
    formats: {
      type: 'json',
    },
    hash: {
      type: 'string',
    },
    ext: {
      type: 'string',
    },
    mime: {
      type: 'string',
    },
    size: {
      type: 'decimal',
    },
    url: {
      type: 'string',
    },
    previewUrl: {
      type: 'string',
    },
    provider: {
      type: 'string',
    },
    provider_metadata: {
      type: 'json',
    },
    // related: {
    //   type: 'relation',
    //   relation: 'oneToMany',
    //   target: 'file_morph',
    //   mappedBy: 'file',
    // },
    // related: {
    //   type: 'relation',
    //   realtion: 'morphTo',
    // },
  },
};

const fileMorph = {
  singularName: 'file-morph',
  uid: 'file-morph',
  tableName: 'file_morphs',
  attributes: {
    // file: {
    //   type: 'relation',
    //   relation: 'manyToOne',
    //   target: 'file',
    //   inversedBy: 'related',
    //   useJoinTable: false,
    // },
  },
};

const orm = new Database({
  connector: 'xx',
  connection: {
    client: 'postgres',
    connection: {
      database: 'strapi',
      user: 'strapi',
      password: 'strapi',
    },
    // debug: true,
  },
  models: Database.transfomrContentType([
    category,
    article,
    compo,
    tags,
    user,
    address,
    file,
    fileMorph,
  ]),
});

// const entityService = uid => {
//   // knows more about abstraction then the query layer
//   // will be moved in the core services not the db
//   // D&P should wrap some d&p logic
//   // i18N should wrapp some i18n logic etc etc

//   const repo = orm.query(uid);

//   return {
//     findById(id) {
//       return repo.findOne({ where: { id } });
//     },

//     async update(id, data) {
//       await repo.update({ where: { id }, data });

//       return repo.findOne({ where: { id } });
//     },
//   };
// };

/*

db.migration.create();
db.migration.up();
db.migration.down();

db.seed.run();
db.seed.create();

db.exporter.dump()
db.importer.restore()

db.schema.addField
db.schema.removeField
db.schema.addCollection
db.schema.removeCollection

*/

async function main() {
  // await orm.schema.drop();
  // await orm.schema.create();

  await orm.schema.reset();
  // await orm.schema.sync();

  // const r = await orm.entityManager
  //   .createQueryBuilder('article')
  //   .select(['*'])
  //   .join({
  //     rootColumn: 'id',
  //     alias: 'ac',
  //     referencedTable: 'categories_articles_articles_links',
  //     referencedColumn: 'article_id',
  //   })
  //   .join({
  //     rootTable: 'ac',
  //     rootColumn: 'category_id',
  //     alias: 'c',
  //     referencedTable: 'categories',
  //     referencedColumn: 'id',
  //   })
  //   .execute();

  // console.log(r);

  // const catA = await entityService('category').findById(348);
  // console.log(catA);
  /*
    orm.contentType('category').loadRelation()
    => query('category').load('xxx')
  */

  // await orm.query('category').delete();

  // const article = await orm.query('article').create({
  //   select: ['id', 'title'],
  //   populate: {
  //     category: {
  //       select: ['price'],
  //       where: {
  //         price: {
  //           $gte: 12,
  //         },
  //       },
  //     },
  //   },
  //   data: {
  //     title: 'my category',
  //     category_id: 1, // TODO: handle category: 1 too
  //   },
  // });

  // console.log(JSON.stringify(article, null, 4));

  await orm.query('category').createMany({
    // select: {},
    // populate: {},
    data: Array(100)
      .fill({})
      .map((v, idx) => ({
        title: `Category ${_.padStart(idx, 3, '0')}`,
      })),
  });

  await orm.query('article').createMany({
    // select: {},
    // populate: {},
    data: Array(100)
      .fill({})
      .map((v, idx) => ({
        title: `Article ${_.padStart(idx, 3, '0')}`,
        category_id: idx + 1,
      })),
  });

  // await orm.query('category').updateMany({
  //   where: {
  //     // articles: {
  //     //   title: {
  //     //     $contains: 'Category',
  //     //   },
  //     // },
  //   },
  //   data: {
  //     title: 'Category 007',
  //   },
  // });

  // const r = await orm.query('category').findMany({
  //   where: {
  //     $and: [
  //       {
  //         title: {
  //           $ne: 'salut',
  //         },
  //       },
  //     ],
  //     title: 'test',
  //     price: {
  //       $gt: 12,
  //     },
  //     articles: {
  //       title: {
  //         $startsWith: 'Test',
  //         // $mode: 'insensitive',
  //       },
  //     },
  //     compo: {
  //       key: 'x',
  //     },
  //   },
  // });

  // // escape stuff
  // // const raw = (strings, )

  // const params = {
  //   select: ['id', 'title'],
  //   where: {
  //     $not: {
  //       $or: [
  //         {
  //           articles: {
  //             category: {
  //               title: 'Category 003',
  //             },
  //           },
  //         },
  //         {
  //           title: {
  //             $in: ['Category 001', 'Category 002'],
  //           },
  //         },
  //         {
  //           title: {
  //             $not: 'Category 001',
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   orderBy: [{ articles: { title: 'asc' } }],
  //   limit: 10,
  //   offset: 0,
  // };

  // const r = await orm.query('category').findMany(params);

  // console.log(r);

  // const r = await orm.query('category').findMany({
  //   where: {
  //     $or: [
  //       {
  //         compo: {
  //           value: {
  //             $gte: 3,
  //           },
  //         },
  //       },
  //       {
  //         articles: {
  //           title: {
  //             $contains: 'test',
  //           },
  //         },
  //       },
  //     ],
  //   },
  // });

  // console.log(r);

  // const r = await orm.query('user').findMany({
  //   where: {
  //     address: {
  //       name: 'A',
  //     },
  //   },
  // });

  // console.log(r);

  // const [results, count] = await orm.query('category').findWithCount(params);

  // console.log({ results, count });

  // await orm.query('category', {
  //   populate: ['articles'],
  // });

  // const address = await orm.query('address').findMany({
  //   populate: {
  //     user: {
  //       // select: ['id', 'address_id'],
  //     },
  //   },
  // });

  // console.log(address);

  // const user = await orm.query('user').findMany({
  //   populate: {
  //     address: {
  //       // select: ['id', 'name'],
  //     },
  //   },
  // });

  // console.log(user);

  // const article = await orm.query('article').findMany({
  //   populate: {
  //     category: true,
  //   },
  // });

  // console.log(article);

  await orm.query('category').findMany({
    populate: {
      compo: true,
      articles: {
        select: ['title'],
        populate: {
          category: {
            select: ['title'],
          },
        },
      },
    },
    limit: 5,
  });

  await orm.query('article').findMany({
    populate: {
      tags: true,
    },
    limit: 5,
  });

  await orm.query('tag').findMany({
    populate: {
      articles: true,
    },
    limit: 5,
  });

  await orm.query('article').findMany({
    limit: 5,
    where: {
      category: {
        title: {
          $contains: '09',
        },
      },
    },
    populate: {
      category: {
        select: ['id', 'title'],
        where: {
          title: {
            $contains: '7',
          },
        },
      },
      tags: true,
      compo: true,
    },
    orderBy: { compo: { key: 'DESC' } },
  });
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(() => orm.destroy());
