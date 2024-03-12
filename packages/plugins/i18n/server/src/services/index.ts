import permissions from './permissions';
import metrics from './metrics';
import localizations from './localizations';
import locales from './locales';
import isoLocales from './iso-locales';
import entityServiceDecorator from './entity-service-decorator';
import contentTypes from './content-types';

export default {
  permissions,
  metrics,
  localizations,
  locales,
  'iso-locales': isoLocales,
  'entity-service-decorator': entityServiceDecorator,
  'content-types': contentTypes,
};
