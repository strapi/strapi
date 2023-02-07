'use strict';

const http = require('http');
const path = require('path');
const fse = require('fs-extra');
const getPort = require('get-port');

const config = {
  port: parseInt(process.env.PORT, 10) || 1339,
};

const args = process.argv.slice(2);

if (!args[0]) {
  console.error('Missing required parameter <package-name>');
  process.exit(1);
}

async function run() {
  const openAPISpecPath = path.join(__dirname, '../../packages', args[0], 'oas.yml');
  const indexPagePath = path.join(__dirname, 'public', 'index.html');

  if (!(await fse.pathExists(openAPISpecPath))) {
    throw new Error(`No OAS configuration found at ${openAPISpecPath}`);
  }

  const server = http.createServer((req, res) => {
    if (req.url === '/spec.yml') {
      return fse.createReadStream(openAPISpecPath).pipe(res);
    }

    return fse.createReadStream(indexPagePath).pipe(res);
  });

  const port = await getPort({ port: config.port });

  server.listen(port, () => {
    console.log(`Server available at http://localhost:${port}`);
  });
}

run().catch((error) => {
  console.log('Unexpected Error:', error);
  process.exit(1);
});
