import { getInputProps } from '../index';

describe('Content Manager | components | FieldForm', () => {
  describe('GetInputProps util', () => {
    it('Should return the correct type depending on the field name', () => {
      expect(getInputProps('description')).toMatchObject({ type: 'text' });
      expect(getInputProps('label')).toMatchObject({ type: 'text' });
      expect(getInputProps('placeholder')).toMatchObject({ type: 'text' });
      expect(getInputProps('mainField')).toMatchObject({ type: 'select' });
      expect(getInputProps('editable')).toMatchObject({ type: 'toggle' });
      expect(getInputProps('test')).toMatchObject({ type: '' });
    });

    it('Should return the correct label for the mainFieldName', () => {
      expect(getInputProps('mainField')).toMatchObject({
        type: 'select',
        label: {
          id: 'content-manager.containers.SettingPage.editSettings.entry.title',
        },
      });
      expect(getInputProps('test')).toMatchObject({
        type: '',
        label: { id: 'content-manager.form.Input.test' },
      });
    });
  });
});
