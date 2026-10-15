import type * as Nexus from 'nexus';
import type { Context } from 'koa';
import type { Core } from '@strapi/types';
import type { User } from '../types';

export type GraphQLFactoryContext = { strapi: Core.Strapi; nexus: typeof Nexus };
export type GraphQLContext = { koaContext: Context; state?: { user?: User } };
export type AuthResponse = { user?: User; jwt?: string; ok?: boolean };
