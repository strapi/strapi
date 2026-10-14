import type { Core } from '@strapi/types';
import type {} from '../types';

import components from './components';
import contentStructure from './content-structure';
import contentTypes from './content-types';
import dataMapper from './data-mapper';
import fieldSizes from './field-sizes';
import metrics from './metrics';
import permissionChecker from './permission-checker';
import permission from './permission';
import populateBuilder from './populate-builder';
import uid from './uid';
import history from '../history';
import preview from '../preview';
import homepage from '../homepage';
import documentMetadata from './document-metadata';
import documentManager from './document-manager';

type RegisteredServiceFactories = {
  [TUID in keyof Strapi.Registries.PackageServices as TUID extends `plugin::content-manager.${infer TName}`
    ? TName
    : never]: (context: { strapi: Core.Strapi }) => Strapi.Registries.PackageServices[TUID];
};

/**
 * Feature modules type their services as a loose `LoadedPlugin` map, and history only registers
 * its services when its feature is enabled: they are not checked here.
 */
type FeatureServiceName = 'history' | 'lifecycles' | 'preview' | 'preview-config';

/**
 * Every registered service name has a factory. The factories keep their published develop types,
 * which the registered contracts refine, so only the names are checked here.
 */
type RegisteredServiceNames = Exclude<keyof RegisteredServiceFactories, FeatureServiceName>;

const services = {
  components,
  'content-structure': contentStructure,
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
} satisfies Record<RegisteredServiceNames, unknown>;

export default services;
