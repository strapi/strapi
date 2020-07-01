// TODO: this condition might change

const fs = require('fs-extra');
const path = require('path');
const appAdminPath = path.join(__dirname, 'admin');

// eslint-disable-next-line node/no-extraneous-require
const hasEE = require('strapi/lib/utils/ee');

module.exports = dir => dir && hasEE({ dir }) && fs.existsSync(path.join(appAdminPath, 'ee'));
