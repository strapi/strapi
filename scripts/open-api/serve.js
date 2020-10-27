/* eslint-disable */
'use strict';

const getPort = require('get-port');

const path = require('path');
const fse = require('fs-extra');
const koa = require('koa');
const koaStatic = require('koa-static');

const args = process.argv.slice(2);

if (!args[0]) {
  console.error('Missing required parameter <package-name>');
  process.exit(1);
}

async function run() {
  const app = new koa();

  const openAPISpecPath = path.join(__dirname, '../../packages', args[0], 'oas.yml');

  if (!(await fse.pathExists(openAPISpecPath))) {
    throw new Error(`No OAS configuration found at ${openAPISpecPath}`);
  }

  app.use(koaStatic(path.join(__dirname, 'public')));

  app.use(ctx => {
    if (ctx.path === '/spec.yml') {
      ctx.body = fse.createReadStream(openAPISpecPath);
    }
  });

  const port = await getPort({ port: 1339 });

  app.listen(port, () => {
    console.log(`Server available at http://localhost:${port}`);
  });
}

run().catch(error => {
  console.log('Unexpected Error:', error);
  process.exit(1);
});
