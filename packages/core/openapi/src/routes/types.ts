import type { Core } from '@strapi/types';

/**
 * A function type that defines a rule for matching a route.
 */
export type MatcherRule = (route: Core.Route) => boolean;
