import components from './components';
import contentTypes from './content-types';
import dataMapper from './data-mapper';
import fieldSizes from './field-sizes';
import metrics from './metrics';
import permissionChecker from './permission-checker';
import permission from './permission';
import populateBuilder from './populate-builder';
import uid from './uid';
import documentMetadata from './document-metadata';
import collectionTypes from './collection-types';
import singleTypes from './single-types';

export default {
  components,
  'content-types': contentTypes,
  'data-mapper': dataMapper,
  'document-metadata': documentMetadata,
  'collection-types': collectionTypes,
  'single-types': singleTypes,
  'field-sizes': fieldSizes,
  metrics,
  'permission-checker': permissionChecker,
  permission,
  'populate-builder': populateBuilder,
  uid,
};
