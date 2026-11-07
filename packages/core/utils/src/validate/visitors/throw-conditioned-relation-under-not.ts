import { isMorphToRelationalAttribute } from '../../content-types';
import type { Path, Visitor } from '../../traverse/factory';
import { throwInvalidKey } from '../utils';

/**
 * Whether a filter path (`path.raw`, relative to the filters) passes through a `$not`. A segment
 * carries one index per list it sits in (`$not[0][0]` for `filters[$not][0][0][…]`), and all of
 * them are dropped.
 */
const isUnderNot = (raw: string | null) =>
  raw !== null && raw.split('.').some((segment) => segment.replace(/(\[\d+\])+$/, '') === '$not');

/**
 * Refuses a filter on a relation whose target the caller's data rules restrict when a `$not` sits
 * anywhere above it. The query layer joins a relation filter with a LEFT JOIN and applies `$not` to
 * each joined row, so the rows of related entries the caller can't read come out true under the
 * negation: `filters[$not][notes][id][$notNull]=true` would list the folders holding someone
 * else's notes. A to-one hop is not enough to make it safe: a condition's own filter can join a
 * to-many relation and multiply the rows. `sanitize.query` makes such a `$not` match nothing.
 *
 * Run it on the filters alone (`path.raw` starting at them), with `isRestricted` from
 * `createRelationRestriction`. It is asked about a target uid with the visited key's `path`.
 */
export default (isRestricted: (uid: string, path?: Path) => boolean): Visitor =>
  ({ key, attribute, path }) => {
    if (
      attribute?.type !== 'relation' ||
      isMorphToRelationalAttribute(attribute) ||
      typeof attribute.target !== 'string'
    ) {
      return;
    }

    if (isUnderNot(path.raw) && isRestricted(attribute.target, path)) {
      throwInvalidKey({
        key,
        path: path.attribute,
        reason: 'filtering through this relation inside $not is not allowed',
      });
    }
  };
