import type { SanitizedAdminUser } from '../../../../shared/contracts/shared';
import type { IntlShape } from 'react-intl';

/**
 * Retrieves the display name of an admin panel user
 */
const getDisplayName = (
  { firstname, lastname, username, email }: SanitizedAdminUser,
  formatMessage: IntlShape['formatMessage']
) => {
  if (username) {
    return username;
  }

  // firstname is not required if the user is created with a username
  if (firstname) {
    return formatMessage(
      {
        id: 'global.fullname',
        defaultMessage: '{firstname} {lastname}',
      },
      {
        firstname,
        lastname,
      }
    ).trim();
  }

  return email;
};

export { getDisplayName };
