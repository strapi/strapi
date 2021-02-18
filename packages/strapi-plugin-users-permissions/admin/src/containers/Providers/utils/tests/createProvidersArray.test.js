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
      cognito: {
        enabled: false,
        icon: 'aws',
        key: '',
        secret: '',
        subdomain: '',
        callback: '/auth/cognito/callback',
        scope: ['email', 'openid', 'profile'],
      },
    };

    const expected = [
      {
        name: 'cognito',
        icon: ['fab', 'aws'],
        enabled: false,
        subdomain: '',
      },
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
