import { isMorphToRelationalAttribute } from '../../content-types';
import type { Path, Visitor } from '../../traverse/factory';
import { throwInvalidKey } from '../utils';

/**
 * Refuses a sort through a relation whose target the caller's data rules restrict: a condition, or
 * a held row that denies. Strapi's sort syntax can't carry a condition, so such a sort would order
 * the caller's entries by entries they can't read (an ordering oracle). `sanitize.query` drops the
 * same sorts. A target the caller holds no row for is not restricted.
 *
 * `isRestricted` answers for a target uid, reached at the visited key's `path` (a type's drafts
 * restrict where the rows a sort joins from link to them); `createRelationRestriction` makes one
 * that asks the checker once per uid for the whole request.
 *
 * @experimental Public for now, shared with `@strapi/plugin-end-users`. May change in a minor release.
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

    if (isRestricted(attribute.target, path)) {
      throwInvalidKey({
        key,
        path: path.attribute,
        reason: 'sorting through this relation is not allowed',
      });
    }
  };
