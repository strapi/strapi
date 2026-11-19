import type * as Attribute from '../../schema/attribute';
import type { SystemAttributes, WithSystemAttributes } from '../schema';
import type { Equal, Expect } from '../../../tests/helpers/assert';

type Title = Attribute.String & Attribute.Required;

// One object type, as type generation writes it, so a declaration can be compared with it.
declare const systemAttributeChecks: [
  Expect<
    Equal<
      WithSystemAttributes<'plugin::catalog.tag', { title: Title }>,
      {
        title: Title;
        createdAt: Attribute.DateTime;
        updatedAt: Attribute.DateTime;
        publishedAt: Attribute.DateTime;
        createdBy: Attribute.Relation<'oneToOne', 'admin::user'> & Attribute.Private;
        updatedBy: Attribute.Relation<'oneToOne', 'admin::user'> & Attribute.Private;
        locale: Attribute.String & Attribute.Private;
        localizations: Attribute.Relation<'oneToMany', 'plugin::catalog.tag'> & Attribute.Private;
      }
    >
  >,
  // An own attribute replaces the system attribute of the same name.
  Expect<
    Equal<
      WithSystemAttributes<'plugin::catalog.tag', { locale: Attribute.String }>['locale'],
      Attribute.String
    >
  >,
  Expect<
    Equal<
      Omit<WithSystemAttributes<'plugin::catalog.tag', { locale: Attribute.String }>, 'locale'>,
      Omit<SystemAttributes<'plugin::catalog.tag'>, 'locale'>
    >
  >,
];
systemAttributeChecks satisfies unknown;
