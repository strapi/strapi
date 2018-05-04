#!/bin/sh
set -e

if [ -z "$TEST_GREP" ]; then
   TEST_GREP=""
fi

node node_modules/mocha/bin/_mocha `scripts/_get-test-directories.sh` --opts test/mocha.opts --grep "$TEST_GREP"

# start=`date +%s`

# Test `strapi-admin`
# cd packages/strapi-admin
# npm run test
#
# # Test `strapi-plugin-content-manager`
# cd ../strapi-plugin-content-manager
# npm run test
#
# # Test `strapi-plugin-settings-manager`
# cd ../strapi-plugin-settings-manager
# npm run test
#
# # Test `strapi-plugin-content-type-builder`
# cd ../strapi-plugin-content-type-builder
# npm run test
#
# # Test `strapi-plugin-content-type-builder`
# cd ../strapi-plugin-users-permissions
# npm run test
#
# # Test `strapi-plugin-upload`
# cd ../strapi-plugin-upload
# npm run test
#
# # Test strapi-utils
# cd ../strapi-utils
# npm run test
#
# # Test `strapi-helper-plugin`
# cd ../strapi-helper-plugin/lib
# npm run test
#
#
# # for dir in ./packages/*/
# # do
# #     dir=${dir%*/}
# #     echo ${dir##*/}
# #     cd packages/${dir##*/}
# #     npm run test
# #     cd ../..
# # done
# # end=`date +%s`
# #
# # runtime=$((end-start))
# # echo Test took ${runtime}
