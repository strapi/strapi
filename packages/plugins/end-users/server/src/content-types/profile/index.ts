import { graphqlTypeNames } from '../../compat/graphql/names';
import { USER_UID } from '../../constants';

/**
 * `plugin::end-users.profile` (`eu_profiles`): what a project knows about an end user beyond what
 * authentication needs. The user type is locked (`schema/to-content-types.ts`), so a project's own
 * fields live here instead, added in the Content-Type Builder like on any other type.
 *
 * The stock schema is one attribute: `user`. It is a one-way relation (`oneToOne` with no
 * `inversedBy`: nothing is added to the user, and the boot check refuses a relation to the user that
 * has an inverse side), `required`, and `configurable: false`, so the Content-Type Builder can
 * neither edit nor delete it. Everything else is the project's. A project's fields are written to
 * `src/extensions/end-users/content-types/profile/schema.json`; a schema file replaces the
 * attribute list as a whole, so it has to keep `user` as it is here.
 *
 * Which fields a sign-up may write is the `registrationFields` setting (`service('settings')`), and
 * not every field of the profile: see `strapi-profile`.
 *
 * The profile has no life of its own: it is created and deleted with its user, and is
 * never moved to another. A link table cannot carry a unique constraint, so three rules keep that
 * true: `create-profile` makes the profile when a user is made, `cascade-user-delete` removes it
 * with the user, and `one-profile-per-user` refuses every other create, delete or clone, any change
 * of the `user`, and a second profile for the same user.
 */
export default {
  schema: {
    kind: 'collectionType',
    collectionName: 'eu_profiles',
    info: {
      singularName: 'profile',
      pluralName: 'profiles',
      displayName: 'Profile',
      description: 'Custom data of an end user',
    },
    options: { draftAndPublish: false },
    pluginOptions: {
      i18n: { localized: false },
      // `EndUserProfile`, `endUserProfiles`, ... on GraphQL
      graphql: { typeName: graphqlTypeNames(false).profile },
    },
    attributes: {
      user: {
        type: 'relation',
        relation: 'oneToOne',
        target: USER_UID,
        required: true,
        configurable: false,
      },
    },
  },
};
