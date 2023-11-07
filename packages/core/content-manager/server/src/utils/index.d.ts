import components from '../services/components';
import configuration from '../services/configuration';
import contentTypes from '../services/content-types';
import dataMapper from '../services/data-mapper';
import entityManager from '../services/entity-manager';
import fieldSizes from '../services/field-sizes';
import metrics from '../services/metrics';
import permissionChecker from '../services/permission-checker';
import permission from '../services/permission';
import uid from '../services/uid';

type S = {
  ['content-types']: typeof contentTypes;
  ['data-mapper']: typeof dataMapper;
  ['entity-manager']: typeof entityManager;
  ['permission-checker']: typeof permissionChecker;
  components: typeof components;
  configuration: typeof configuration;
  ['field-sizes']: typeof fieldSizes;
  metrics: typeof metrics;
  permission: typeof permission;
  uid: typeof uid;
};

export function getService<T extends keyof S>(name: T): ReturnType<S[T]>;
