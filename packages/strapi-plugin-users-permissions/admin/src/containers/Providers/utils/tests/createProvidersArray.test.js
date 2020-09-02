import createProvidersArray from '../createProvidersArray';

describe('USERS PERMISSIONS | CONTAINERS | Providers | utils | createProvidersArray', () => {
  it('should format the data correctly', () => {
    const data = {
      email: { enabled: true, icon: 'envelope' },
      discord: {
        callback: '/auth/discord/callback',
        enabled: false,
        icon: 'discord',
        key: '',
        scope: ['identify', 'email'],
        secret: '',
      },
    };

    const expected = [
      {
        name: 'discord',
        icon: ['fab', 'discord'],
        enabled: false,
      },
      {
        name: 'email',
        icon: ['fas', 'envelope'],
        enabled: true,
      },
    ];

    expect(createProvidersArray(data)).toEqual(expected);
  });
});
