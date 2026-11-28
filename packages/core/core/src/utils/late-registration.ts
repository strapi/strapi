import type { Core } from '@strapi/types';

/**
 * A registration that arrived after its registration window closed: Strapi accepted it, but the
 * lifecycle step that reads it already ran, so it has no effect, or only part of it.
 *
 * The caller decides that the window is closed, with a flag that the closing step sets (for
 * example `areRoutesRegistered`, set by `server.initRouting()`). Never with `strapi.isLoaded`: it
 * stays `false` through the whole bootstrap phase.
 */
export type LateRegistration = {
  /** The registration surface, for example `'routes'`. With `key`, identifies the warning. */
  surface: string;
  /** Identifies the registration within its surface, for example `'plugin::foo:content-api:GET /bar'`. */
  key: string;
  /** What was registered, for example `'Route "GET /bar" of plugin::foo'`. */
  subject: string;
  /** The step that closed the window, as it reads after "after", for example `'Strapi registered the routes'`. */
  closedBy: string;
  /** What happens to the registration, for example `'Strapi does not serve it'`. */
  effect: string;
  /** Where to register instead, as it reads after "Register it", for example `'from a register function'`. */
  registerIn: string;
};

/** The warnings already logged, per Strapi app. */
const warnedRegistrations = new WeakMap<Core.Strapi, Set<string>>();

const formatLateRegistration = ({ subject, closedBy, effect, registerIn }: LateRegistration) =>
  `[strapi] ${subject} was registered after ${closedBy}: ${effect}. Register it ${registerIn}.`;

/**
 * Development only: warns once per app, surface and key that a registration arrived after its
 * registration window closed. It never throws and changes nothing else.
 *
 * Message: `[strapi] <subject> was registered after <closedBy>: <effect>. Register it <registerIn>.`
 *
 * "Development" is the `development` environment (`NODE_ENV`), as for the unknown filter key
 * warning of the query params service.
 */
export const warnLateRegistration = (strapi: Core.Strapi, registration: LateRegistration): void => {
  if (strapi.config.get('environment') !== 'development') {
    return;
  }

  const warned = warnedRegistrations.get(strapi) ?? new Set<string>();
  warnedRegistrations.set(strapi, warned);

  const warningKey = JSON.stringify([registration.surface, registration.key]);

  if (warned.has(warningKey) === true) {
    return;
  }

  warned.add(warningKey);
  strapi.log.warn(formatLateRegistration(registration));
};
