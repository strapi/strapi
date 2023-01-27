import type { Diff } from '../../../utils/json';
import * as utils from '../../../utils';

const strategies = {
  // No diffs
  exact(diffs: Diff[]) {
    return diffs;
  },

  // Diffs allowed on specific attributes properties
  strict(diffs: Diff[]) {
    const isIgnorableDiff = (diff: Diff) => {
      return (
        // Ignore cases where one field is missing and the other is falsey
        (diff.kind === 'dataType' && diff.types.includes('undefined')) ||
        // Ignore cases where...
        (diff.path.length === 3 &&
          // Root property must be attributes
          diff.path[0] === 'attributes' &&
          // Need a valid string attribute name
          typeof diff.path[1] === 'string' &&
          // The diff must be on ignorable attribute properties
          ['private', 'required', 'configurable'].includes(diff.path[2]))
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
