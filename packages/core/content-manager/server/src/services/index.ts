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
import customOrder from '../custom-order';
import documentMetadata from './document-metadata';
import documentManager from './document-manager';
import type { services as historyServices } from '../history/services';
import type { services as previewServices } from '../preview/services';
import type { services as customOrderServices } from '../custom-order/services';

/**
 * Names of the services of the feature modules typed as a loose `LoadedPlugin`. Spreading such a
 * map drops its names from the composed map's type, so they are read from the feature maps.
 * History only registers its services when its feature is enabled.
 */
type FeatureServiceName =
  keyof typeof historyServices | keyof typeof previewServices | keyof typeof customOrderServices;

/** Names of the registered Content Manager services. */
type RegisteredServiceName = keyof Core.RegisteredFor<
  Strapi.Registries.PackageServices,
  'plugin::content-manager'
>;

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
  ...(customOrder.services ? customOrder.services : {}),
  ...homepage.services,
} satisfies Record<Exclude<RegisteredServiceName, FeatureServiceName>, unknown>;

/** Names of the composed service map, feature services included. */
export type ServiceMapNames = keyof typeof services | FeatureServiceName;

// Every registered service name has a factory, and every factory a registered name. The factories
// keep their published develop types, which the registered contracts refine, so only the names are
// checked here.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ServiceNames = Core.Assert<Core.SameNames<ServiceMapNames, RegisteredServiceName>>;

export default services;
