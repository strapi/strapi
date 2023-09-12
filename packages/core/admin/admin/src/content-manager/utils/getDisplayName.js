/**
 * Retrieves the display name of an admin panel user
 * @typedef AdminUserNamesAttributes
 * @property {string} firstname
 * @property {string} lastname
 * @property {string} username
 * @property {string} email
 *
 * @type {(user: AdminUserNamesAttributes, formatMessage: import('react-intl').formatMessage) => string}
 */
const getDisplayName = ({ firstname, lastname, username, email }, formatMessage) => {
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
