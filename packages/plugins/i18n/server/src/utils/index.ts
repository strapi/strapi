import locales from '../services/locales';
import permissions from '../services/permissions';
import contentTypes from '../services/content-types';
import metrics from '../services/metrics';
import entityServiceDecorator from '../services/entity-service-decorator';
import coreAPI from '../services/core-api';
import ISOLocales from '../services/iso-locales';
import localizations from '../services/localizations';

type S = {
  permissions: typeof permissions;
  metrics: typeof metrics;
  locales: typeof locales;
  localizations: typeof localizations;
  ['iso-locales']: typeof ISOLocales;
  ['content-types']: typeof contentTypes;
  ['entity-service-decorator']: typeof entityServiceDecorator;
  ['core-api']: typeof coreAPI;
};

const getCoreStore = () => {
  return strapi.store({ type: 'plugin', name: 'i18n' });
};

// retrieve a local service
const getService = <T extends keyof S>(name: T): ReturnType<S[T]> => {
  return strapi.plugin('i18n').service(name);
};

export { getService, getCoreStore };
