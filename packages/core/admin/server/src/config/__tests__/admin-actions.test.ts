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
});
