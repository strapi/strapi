const data = {
  withRegistrationToken: {
    id: 1,
    firstname: 'firstname',
    lastname: 'lastname',
    username: null,
    email: 'soup@soup.com',
    isActive: false,
    roles: [{ id: 1, name: 'Super Admin' }],
    registrationToken: 'my-super-token',
  },
  other: {
    id: 1,
    firstname: 'soup',
    lastname: 'soup',
    username: 'Display username',
    email: 'soup@soup.com',
    isActive: false,
    roles: [
      { id: 1, name: 'Super Admin' },
      { id: 2, name: 'Author' },
    ],
    registrationToken: null,
  },
};

export default data;
