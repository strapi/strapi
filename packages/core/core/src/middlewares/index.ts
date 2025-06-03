import type { Core } from '@strapi/types';
import { compression } from './compression';
import { cors } from './cors';
import { errors } from './errors';
import { favicon } from './favicon';
import { ip } from './ip';
import { logger } from './logger';
import { poweredBy } from './powered-by';
import { body } from './body';
import { query } from './query';
import { responseTime } from './response-time';
import { responses } from './responses';
import { security } from './security';
import { session } from './session';
import { publicStatic } from './public';

export const middlewares: Record<string, Core.MiddlewareFactory> = {
  compression,
  cors,
  errors,
  favicon,
  ip,
  logger,
  poweredBy,
  body,
  query,
  responseTime,
  responses,
  security,
  session,
  public: publicStatic,
};
