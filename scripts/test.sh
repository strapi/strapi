#!/bin/sh
set -e

if [ -z "$TEST_GREP" ]; then
   TEST_GREP=""
fi

node --harmony-async-await node_modules/mocha/bin/_mocha `scripts/_get-test-directories.sh` --opts test/mocha.opts --grep "$TEST_GREP"
cd packages/strapi-generate-admin/files/admin/public
npm install
npm run test
