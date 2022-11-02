'use strict';

// TODO: this should return 'export_yyyymmddHHMMSS' before we release
const getDefaultExportBackupName = () => {
  return 'strapi-backup';
};

module.exports = {
  getDefaultExportBackupName,
};
