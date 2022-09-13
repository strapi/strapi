import { getTrad } from '../../../utils';

const getInputProps = (fieldName) => {
  let type;

  switch (fieldName) {
    case 'description':
    case 'label':
    case 'placeholder':
      type = 'text';
      break;
    case 'mainField':
      type = 'select';
      break;
    case 'editable':
      type = 'bool';
      break;
    default:
      type = '';
  }

  const labelId =
    fieldName === 'mainField'
      ? getTrad('containers.SettingPage.editSettings.entry.title')
      : getTrad(`form.Input.${fieldName}`);

  return { type, label: { id: labelId } };
};

export default getInputProps;
