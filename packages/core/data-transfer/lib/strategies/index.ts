import type { Diff } from '../../types';

import { jsonDiffs } from '../utils';

const calculateSchemaDiffs = <T, P>(a: T, b: P) => {
  const diffs = jsonDiffs(a, b);

  return {
    get diffs() {
      return diffs;
    },

    // No diffs
    exact() {
      return diffs.length === 0;
    },

    // Diffs allowed on specific attributes properties
    strict() {
      const isIgnorableDiff = ({ path }: Diff) => {
        return (
          path.length === 3 &&
          // Root property must be attributes
          path[0] === 'attributes' &&
          // Need a valid string attribute name
          typeof path[1] === 'string' &&
          // The diff must be on ignorable attribute properties
          ['private', 'required', 'configurable'].includes(path[2])
        );
      };

      const shouldKeepDiff = (diff: Diff) => !isIgnorableDiff(diff);

      return diffs.filter(shouldKeepDiff).length === 0;
    },
  };
};

export default calculateSchemaDiffs;
