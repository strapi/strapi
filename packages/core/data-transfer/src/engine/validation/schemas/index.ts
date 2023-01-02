import type { Diff } from '../../../utils/json';
import * as utils from '../../../utils';

const strategies = {
  // No diffs
  exact(diffs: Diff[]) {
    return diffs;
  },

  // Diffs allowed on specific attributes properties
  strict(diffs: Diff[]) {
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

    return diffs.filter(shouldKeepDiff);
  },
};

const compareSchemas = <T, P>(a: T, b: P, strategy: keyof typeof strategies) => {
  const diffs = utils.json.diff(a, b);
  return strategies[strategy](diffs);
};

export { compareSchemas };
