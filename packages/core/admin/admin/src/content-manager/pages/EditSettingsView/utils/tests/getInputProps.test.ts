import getInputProps from '../getInputProps';

describe('CONTENT MANAGER | containers | EditSettingsView | utils | getInputProps', () => {
  it('should return the correct label and type for the description meta', () => {
    expect(getInputProps('description')).toHaveProperty('type');
    expect(getInputProps('description')).toHaveProperty('label');
    expect(getInputProps('description').label.id).toEqual('content-manager.form.Input.description');
    expect(getInputProps('description').type).toEqual('text');
    expect(getInputProps('label').type).toEqual('text');
    expect(getInputProps('placeholder').type).toEqual('text');
  });

  it('should handle the mainField case correctly', () => {
    expect(getInputProps('mainField')).toHaveProperty('type');
    expect(getInputProps('mainField')).toHaveProperty('label');
    expect(getInputProps('mainField').type).toEqual('select');
    expect(getInputProps('mainField').label.id).toEqual(
      'content-manager.containers.SettingPage.editSettings.entry.title'
    );
  });

  it('should handle the editable case correctly', () => {
    expect(getInputProps('editable').type).toEqual('bool');
  });

  it('should handle the default case correctly', () => {
    expect(getInputProps(null).type).toEqual('');
  });
});
