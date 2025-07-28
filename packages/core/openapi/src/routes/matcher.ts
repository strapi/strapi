import type { Core } from '@strapi/types';

import type { MatcherRule } from './types';

/**
 * Class responsible for matching routes based on provided rules.
 */
export class RouteMatcher {
  /**
   * Array of rules to match routes against.
   */
  private readonly _rules: MatcherRule[];

  /**
   * @param rules - A list of matcher rules to apply. Defaults to an empty array.
   */
  constructor(rules: MatcherRule[] = []) {
    this._rules = rules;
  }

  /**
   * Checks if a given route matches all provided rules.
   *
   * Exits early if any rule fails.
   *
   * @param route - The route to check.
   * @returns `true` if the route satisfies all rules, otherwise `false`.
   */
  match(route: Core.Route): boolean {
    return this._rules.every((rule) => rule(route));
  }
}
