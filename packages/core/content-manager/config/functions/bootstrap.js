'use strict';

const { getService } = require('../../utils');

module.exports = async () => {
  console.log('before');
  await getService('components').syncConfigurations();
  await getService('content-types').syncConfigurations();
  await getService('permission').registerPermissions();
  console.log('after');
};
