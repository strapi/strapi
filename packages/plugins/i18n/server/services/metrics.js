'use strict';

const { reduce } = require('lodash/fp');
const { ampli } = require('@strapi/telemetry-be');
const { getService } = require('../utils');

const sendDidInitializeEvent = async () => {
  const { isLocalizedContentType } = getService('content-types');

  const numberOfContentTypes = reduce(
    (sum, contentType) => (isLocalizedContentType(contentType) ? sum + 1 : sum),
    0
  )(strapi.contentTypes);

  await ampli.didInitializeI18N(
    '',
    { numberOfContentTypes },
    {},
    { source: 'core', send: strapi.telemetry.send }
  );
};

const sendDidUpdateI18nLocalesEvent = async () => {
  const numberOfLocales = await getService('locales').count();

  await ampli.didUpdateI18NLocales(
    '',
    { numberOfLocales },
    {},
    { source: 'core', send: strapi.telemetry.send }
  );
};

module.exports = () => ({
  sendDidInitializeEvent,
  sendDidUpdateI18nLocalesEvent,
});
