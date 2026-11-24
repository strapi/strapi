import { FormFields, type FormFieldsArgs } from '../FormFields';

const field = (pluginId: string, args: Partial<FormFieldsArgs> = {}): FormFieldsArgs => ({
  pluginId,
  Component: () => null,
  ...args,
});

describe('FormFields', () => {
  let formFields: FormFields;

  beforeEach(() => {
    formFields = new FormFields();
  });

  test('adds an array of fields to a form after the ones already added', () => {
    formFields.unstable_register('user', [field('spaces')]);
    formFields.unstable_register('user', [field('teams')]);

    expect(formFields.get('user').map(({ pluginId }) => pluginId)).toEqual(['spaces', 'teams']);
    expect(formFields.get('role')).toEqual([]);
  });

  test('replaces the fields of a form with what a reducer returns', () => {
    formFields.unstable_register('role', [field('spaces'), field('teams')]);
    formFields.unstable_register('role', (prev) => [field('teams'), ...prev.slice(0, 1)]);

    expect(formFields.get('role').map(({ pluginId }) => pluginId)).toEqual(['teams', 'spaces']);
  });

  test('tells whether a plugin replaces a core field of a form', () => {
    formFields.unstable_register('user', [field('spaces', { replaces: ['roles'] })]);
    formFields.unstable_register('content-api-token', [field('spaces')]);

    expect(formFields.replaces('user', 'roles')).toBe(true);
    expect(formFields.replaces('content-api-token', 'roles')).toBe(false);
  });

  test('refuses an unknown form, a field without a component and a plugin added twice', () => {
    // @ts-expect-error - not a form plugins can add fields to
    expect(() => formFields.unstable_register('webhook', [field('spaces')])).toThrow(
      '"webhook" is not a form plugins can add fields to'
    );
    expect(() =>
      formFields.unstable_register('role', [{ pluginId: 'spaces' } as FormFieldsArgs])
    ).toThrow('A Component must be provided');

    formFields.unstable_register('role', [field('spaces')]);

    expect(() => formFields.unstable_register('role', [field('spaces')])).toThrow(
      'Fields of the "spaces" plugin have already been added to the role form'
    );
    expect(formFields.get('role')).toHaveLength(1);
  });

  test('lets only the user forms replace core fields', () => {
    expect(() =>
      formFields.unstable_register('role', [field('spaces', { replaces: ['roles'] })])
    ).toThrow('Only the user forms let a plugin replace core fields');
    expect(formFields.get('role')).toEqual([]);
  });
});
