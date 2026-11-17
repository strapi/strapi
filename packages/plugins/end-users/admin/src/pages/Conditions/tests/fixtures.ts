import type { ConditionListItem } from '../../../../../shared/contracts/conditions';
import type {
  LayoutContentType,
  LayoutField,
  PermissionLayout,
} from '../../../../../shared/contracts/permissions';

export const ARTICLE = 'api::article.article';
export const COMMENT = 'api::comment.comment';
export const USER = 'plugin::end-users.user';

export const field = (
  name: string,
  type: string,
  extra: Partial<LayoutField> = {}
): LayoutField => ({
  name,
  label: name,
  type,
  required: false,
  engineOwned: false,
  ...extra,
});

export const contentType = (
  uid: string,
  label: string,
  fields: LayoutField[]
): LayoutContentType => ({
  uid,
  label,
  kind: 'collectionType',
  actions: [],
  fields,
  locked: [],
  conditions: [],
});

const owner = field('owner', 'relation', { relationTarget: USER });

/**
 * A project with an Article that has a field of each type the builder offers and some it doesn't,
 * a Comment that shares some of them (`views` is a string there), and the end user.
 */
export const LAYOUT: PermissionLayout = {
  groups: [],
  contentTypes: [
    contentType(ARTICLE, 'Article', [
      field('title', 'string'),
      field('views', 'integer'),
      field('rating', 'float'),
      field('published', 'boolean'),
      field('publishedOn', 'date'),
      field('code', 'biginteger'),
      field('kind', 'enumeration'),
      owner,
      field('editor', 'relation', { relationTarget: 'api::person.person' }),
      field('body', 'blocks'),
      field('cover', 'media'),
      field('seo', 'component', { children: [field('seo.title', 'string')] }),
    ]),
    contentType(COMMENT, 'Comment', [
      field('title', 'string'),
      // The same name as on Article, another type
      field('views', 'string'),
      owner,
      field('text', 'text'),
    ]),
    contentType(USER, 'End user', [
      field('email', 'email'),
      field('name', 'string'),
      field('age', 'integer'),
      field('emailVerified', 'boolean'),
      field('avatar', 'media'),
    ]),
  ],
};

/** A condition as the list answers it: what a test names, and a condition that does nothing more */
export const listItem = (
  item: Pick<ConditionListItem, 'name' | 'displayName' | 'subjects' | 'source'> &
    Partial<ConditionListItem>
): ConditionListItem => ({
  params: [],
  stamp: false,
  lockedFields: false,
  usedBy: 0,
  usedByRoles: [],
  editable: item.source === 'builder',
  ...item,
});
