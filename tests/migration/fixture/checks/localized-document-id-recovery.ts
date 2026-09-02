const { validateLocalizedDocumentIdRecovery } = require('../check-impl');

type Strapi = import('@strapi/types').Core.Strapi;

type RecoveryFixture = {
  tableName: string;
  existingDocumentId: string;
  rows: Array<{ locale: string; marker: string }>;
};

module.exports = {
  id: 'localizedDocumentIdRecovery',
  title: 'Localized document_id retry recovery',
  async run({
    strapi,
    spec,
    dataOrigin,
  }: {
    strapi: Strapi;
    spec: { localizedDocumentIdRecovery: RecoveryFixture };
    dataOrigin: string;
  }) {
    if (dataOrigin !== 'v4') {
      return { errors: [] };
    }

    return validateLocalizedDocumentIdRecovery(strapi, spec.localizedDocumentIdRecovery);
  },
};
