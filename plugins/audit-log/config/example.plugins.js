module.exports = {
  'audit-log': {
    enabled: true,
    excludeContentTypes: ['plugin::users-permissions.user', 'plugin::upload.file', 'plugin::audit-log.audit-log'],
    logFullPayloadOn: ['create', 'delete'],
    maxDiffSize: 10240
  }
};
