import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

/** Strapi runs with `autoReload` under `strapi develop`, and only there */
export const isAutoReload = (strapi: Core.Strapi): boolean =>
  strapi.config.get<boolean>('autoReload', false) === true;

/**
 * The builder writes files the server restarts on, which only a development server does: a policy
 * error of code `DEVELOPMENT_ONLY` (403) everywhere else. Both the route policy and the
 * file writes ask it, so a write called directly is refused the same way.
 */
export const assertAutoReload = (strapi: Core.Strapi): void => {
  if (!isAutoReload(strapi)) {
    throw new errors.PolicyError(
      'Conditions can only be created, changed or deleted while the server runs in development mode (strapi develop)',
      { code: 'DEVELOPMENT_ONLY' }
    );
  }
};
