const getDisplayName = ({ firstname, lastname, username, email }, formatMessage) => {
  if (username) {
    return username;
  }

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

export default getDisplayName;
