import formatPolicies from '../formatPolicies';

describe('USERS PERMISSIONS | utils | formatPolicies', () => {
  it('should format the policies correctly', () => {
    const policies = ['customPolicies', 'rateLimit', 'isAuthenticated'];

    const expected = [
      { label: 'customPolicies', value: 'customPolicies' },
      { label: 'rateLimit', value: 'rateLimit' },
      { label: 'isAuthenticated', value: 'isAuthenticated' },
    ];

    expect(formatPolicies(policies)).toEqual(expected);
  });
});
