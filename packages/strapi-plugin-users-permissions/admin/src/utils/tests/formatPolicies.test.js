import formatPolicies from '../formatPolicies';

describe('USERS PERMISSIONS | utils | formatPolicies', () => {
  it('should format the policies correclty', () => {
    const policies = ['custompolicies', 'ratelimit', 'isauthenticated'];

    const expected = [
      { label: 'custompolicies', value: 'custompolicies' },
      { label: 'ratelimit', value: 'ratelimit' },
      { label: 'isauthenticated', value: 'isauthenticated' },
    ];

    expect(formatPolicies(policies)).toEqual(expected);
  });
});
