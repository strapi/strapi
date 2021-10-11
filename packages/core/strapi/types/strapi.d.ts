import { Database } from '@strapi/database';
import { Server } from '@strapi/admin';

import { Strapi as StrapiClass } from '../lib/Strapi';

export interface Strapi extends StrapiClass {
  admin: Server;
  // entityService: EntityService;
}
