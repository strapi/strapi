import { createIntl } from 'react-intl';

import { describeEnforcementChanges, describeTrustChange } from '../describeSecurityChanges';

const intl = createIntl({ locale: 'en', messages: {} });
const roles = [
  { id: 1, name: 'Editor' },
  { id: 2, name: 'Author' },
  { id: 3, name: 'Reviewer' },
];

const enforcement = (
  previous: Parameters<typeof describeEnforcementChanges>[0],
  next: Parameters<typeof describeEnforcementChanges>[1]
) => describeEnforcementChanges(previous, next, roles, intl.formatMessage, intl.formatList);

const settings = (
  mode: 'off' | 'optional' | 'required',
  requiredRoles: string[] = [],
  graceDays = 7
) => ({ mode, requiredRoles, graceDays });

describe('describeEnforcementChanges', () => {
  it('names a single dropped role', () => {
    expect(enforcement(settings('optional', ['1']), settings('off', ['1']))).toEqual([
      'Two-factor authentication will no longer be required for Editor.',
    ]);
  });

  it('lists several dropped roles', () => {
    expect(enforcement(settings('optional', ['1', '2']), settings('optional', []))).toEqual([
      'Two-factor authentication will no longer be required for Editor and Author.',
    ]);
    expect(enforcement(settings('optional', ['1', '2', '3']), settings('optional', ['2']))).toEqual(
      ['Two-factor authentication will no longer be required for Editor and Reviewer.']
    );
  });

  it('falls back to the id of a role it does not know', () => {
    expect(enforcement(settings('optional', ['9']), settings('off', ['9']))).toEqual([
      'Two-factor authentication will no longer be required for 9.',
    ]);
  });

  it('says anyone when everyone stops being required and nothing replaces it', () => {
    expect(enforcement(settings('required', ['1']), settings('off', ['1']))).toEqual([
      'Two-factor authentication will no longer be required for anyone.',
    ]);
  });

  it('says everyone except the selected roles when required for everyone narrows to roles', () => {
    expect(enforcement(settings('required'), settings('optional', ['1', '2']))).toEqual([
      'Two-factor authentication will no longer be required for everyone except Editor and Author.',
    ]);
  });

  it('adds a sentence for a longer grace period, with the old value', () => {
    expect(enforcement(settings('required', [], 7), settings('required', [], 14))).toEqual([
      'Users will have 14 days instead of 7 to set up two-factor authentication.',
    ]);
    expect(enforcement(settings('required', [], 1), settings('required', [], 2))[0]).toBe(
      'Users will have 2 days instead of 1 to set up two-factor authentication.'
    );
  });

  it('says nothing for a raise, a shorter grace period or a role that was never enforced', () => {
    expect(enforcement(settings('off', ['1']), settings('required'))).toEqual([]);
    expect(enforcement(settings('required', [], 14), settings('required', [], 7))).toEqual([]);
    expect(enforcement(settings('off', ['1']), settings('off', []))).toEqual([]);
  });

  it('keeps the grace sentence out when the mode is off', () => {
    expect(enforcement(settings('optional', ['1'], 7), settings('off', ['1'], 30))).toEqual([
      'Two-factor authentication will no longer be required for Editor.',
    ]);
  });
});

describe('describeTrustChange', () => {
  it('names the new and old number of days', () => {
    expect(
      describeTrustChange(
        { enabled: true, days: 29 },
        { enabled: true, days: 60 },
        intl.formatMessage
      )
    ).toBe('Trusted devices will skip the code for 60 days instead of 29.');
  });

  it('uses the singular for one day', () => {
    expect(
      describeTrustChange(
        { enabled: true, days: 0 },
        { enabled: true, days: 1 },
        intl.formatMessage
      )
    ).toBe('Trusted devices will skip the code for 1 day instead of 0.');
  });

  it('says users will be able to trust a device when trust was off', () => {
    expect(
      describeTrustChange(
        { enabled: false, days: 30 },
        { enabled: true, days: 30 },
        intl.formatMessage
      )
    ).toBe('Users will be able to trust a device to skip the code for 30 days.');
  });
});
