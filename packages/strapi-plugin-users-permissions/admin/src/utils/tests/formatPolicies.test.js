import formatPolicies from '../formatPolicies';

describe('formatPolicies', () => {
  it('should format the policies correclty', () => {
    const policies = ['custompolicies', 'ratelimit', 'isauthenticated'];

    const expected = [
      { value: 'custompolicies' },
      { value: 'ratelimit' },
      { value: 'isauthenticated' },
    ];

    expect(formatPolicies(policies)).toEqual(expected);
  });
});
