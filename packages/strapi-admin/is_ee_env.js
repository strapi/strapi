// TODO: this condition might change

const fs = require('fs-extra');
const path = require('path');
const appSrc = path.join(__dirname, 'admin', 'src');

module.exports = fs.existsSync(path.join(appSrc, 'ee'));
