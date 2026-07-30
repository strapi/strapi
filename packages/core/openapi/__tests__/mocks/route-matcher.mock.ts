import { type MatcherRule, RouteMatcher } from '../../src/routes';

const DEFAULT_RULES: MatcherRule[] = [(route) => route.info.type === 'content-api'];

export class RouteMatcherMock extends RouteMatcher {
  constructor(rules: MatcherRule[] = DEFAULT_RULES) {
    super(rules);
  }
}
