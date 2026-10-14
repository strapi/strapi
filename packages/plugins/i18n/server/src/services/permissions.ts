import type { Core } from '@strapi/types';
import createActionsService from './permissions/actions';
import createSectionsBuilderService from './permissions/sections-builder';
import createEngineService from './permissions/engine';

const permissions = ({ strapi }: { strapi: Core.Strapi }) => ({
  actions: createActionsService({ strapi }),
  sectionsBuilder: createSectionsBuilderService({ strapi }),
  engine: createEngineService({ strapi }),
});

type PermissionsService = typeof permissions;

export default permissions;
export type { PermissionsService };
