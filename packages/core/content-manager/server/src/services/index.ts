import components from '@content-manager/server/services/components';
import contentTypes from '@content-manager/server/services/content-types';
import dataMapper from '@content-manager/server/services/data-mapper';
import fieldSizes from '@content-manager/server/services/field-sizes';
import metrics from '@content-manager/server/services/metrics';
import permissionChecker from '@content-manager/server/services/permission-checker';
import permission from '@content-manager/server/services/permission';
import populateBuilder from '@content-manager/server/services/populate-builder';
import uid from '@content-manager/server/services/uid';
import history from '@content-manager/server/history';
import preview from '@content-manager/server/preview';
import homepage from '@content-manager/server/homepage';
import documentMetadata from '@content-manager/server/services/document-metadata';
import documentManager from '@content-manager/server/services/document-manager';

export default {
  components,
  'content-types': contentTypes,
  'data-mapper': dataMapper,
  'document-metadata': documentMetadata,
  'document-manager': documentManager,
  'field-sizes': fieldSizes,
  metrics,
  'permission-checker': permissionChecker,
  permission,
  'populate-builder': populateBuilder,
  uid,
  ...(history.services ? history.services : {}),
  ...(preview.services ? preview.services : {}),
  ...homepage.services,
};
