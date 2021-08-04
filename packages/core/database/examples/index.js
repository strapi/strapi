'use strict';

const util = require('util');

const { Database } = require('../lib/index');
const models = require('./models');
const connections = require('./connections');

async function main(connection) {
  const orm = await Database.init({
    connection,
    models: Database.transformContentTypes(models),
  });

  try {
    // await orm.schema.drop();
    // await orm.schema.create();

    await orm.schema.reset();

    let res;

    const c1 = await orm.query('comment').create({
      data: {
        title: 'coucou',
      },
    });

    const c2 = await orm.query('video-comment').create({
      data: {
        title: 'coucou',
      },
    });

    res = await orm.query('article').create({
      data: {
        dz: [
          {
            __type: 'comment',
            id: c1.id,
          },
          {
            __type: 'video-comment',
            id: c2.id,
          },
        ],
      },
      populate: {
        dz: true,
      },
    });

    log(res);

    res = await orm.query('article').findMany({
      populate: {
        dz: true,
      },
    });

    log(res);

    // await tests(orm);
  } finally {
    orm.destroy();
  }
}

function log(res) {
  console.log(util.inspect(res, null, null, true));
}

main(connections.sqlite);
