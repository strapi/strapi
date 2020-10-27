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

  const openAPISpecPath = path.join(__dirname, '../packages', args[0], 'oas.yml');

  if (!(await fse.pathExists(openAPISpecPath))) {
    throw new Error(`No OAS configuration found at ${openAPISpecPath}`);
  }

  app.use(ctx => {
    if (ctx.path === '/spec.yml') {
      ctx.body = fse.createReadStream(openAPISpecPath);
      return;
    }

    ctx.body = indexPage;
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

const indexPage = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link
      href="https://fonts.googleapis.com/css?family=Nunito"
      rel="stylesheet"
    />
    <script
      type="module"
      src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"
    ></script>
  </head>
  <body>
    <rapi-doc
      spec-url="/spec.yml"
      allow-server-selection="false"
      show-header="false"
      regular-font="Nunito"
      bg-color="#2B303B"
      text-color="#dee3ec"
      nav-bg-color=""
      nav-text-color=""
      nav-hover-bg-color=""
      nav-hover-text-color=""
      nav-accent-color=""
      primary-color=""
      theme="dark"
      render-style="focused"
      schema-style="table"
    >
    </rapi-doc>
  </body>
</html>
`;
