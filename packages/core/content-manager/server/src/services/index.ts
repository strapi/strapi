import components from './components';
import contentTypes from './content-types';
import dataMapper from './data-mapper';
import entityManager from './entity-manager';
import fieldSizes from './field-sizes';
import metrics from './metrics';
import permissionChecker from './permission-checker';
import permission from './permission';
import populateBuilder from './populate-builder';
import uid from './uid';

export default {
  components,
  'content-types': contentTypes,
  'data-mapper': dataMapper,
  'entity-manager': entityManager,
  'field-sizes': fieldSizes,
  metrics,
  'permission-checker': permissionChecker,
  permission,
  'populate-builder': populateBuilder,
  uid,
};
