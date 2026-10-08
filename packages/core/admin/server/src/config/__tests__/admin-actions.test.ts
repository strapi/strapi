import adminActions from '../admin-actions';

describe('admin actions', () => {
  it('declares the debug-dump.read settings permission', () => {
    const action = adminActions.actions.find((a: any) => a.uid === 'debug-dump.read');
    expect(action).toBeDefined();
    expect(action).toMatchObject({
      uid: 'debug-dump.read',
      pluginName: 'admin',
      section: 'settings',
    });
  });

  it('declares the password-policy read and update settings permissions', () => {
    const actions = adminActions.actions.filter((a: any) => a.uid.startsWith('password-policy.'));

    expect(actions.map((a: any) => a.uid)).toEqual([
      'password-policy.read',
      'password-policy.update',
    ]);
    actions.forEach((action: any) => {
      expect(action).toMatchObject({
        pluginName: 'admin',
        section: 'settings',
        category: 'password policy',
      });
    });
  });
});
