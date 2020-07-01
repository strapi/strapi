// TODO: this condition might change

const fs = require('fs-extra');
const path = require('path');
const appAdminPath = path.join(__dirname, 'admin');

module.exports = fs.existsSync(path.join(appAdminPath, 'eee'));
