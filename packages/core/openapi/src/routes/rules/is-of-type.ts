import type { MatcherRule } from '../types';

export const isOfType = (type: string): MatcherRule => {
  return (route) => route.info.type === type;
};
