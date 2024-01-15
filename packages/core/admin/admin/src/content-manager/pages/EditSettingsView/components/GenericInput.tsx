import { Option, Select, TextInput, ToggleInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';

interface GenericInputProps extends Record<string, unknown> {
  type: string;
  options?: string[];
  onChange: (e: { target: { name: string; value: string | boolean | number } }) => void;
  value: string | boolean | string[];
  name: string;
  label: string;
}

const GenericInput = ({
  type,
  options,
  onChange,
  value,
  name,
  ...inputProps
}: GenericInputProps) => {
  const { formatMessage } = useIntl();

  switch (type) {
    case 'text': {
      return <TextInput onChange={onChange} value={value as string} name={name} {...inputProps} />;
    }
    case 'bool': {
      return (
        <ToggleInput
          onChange={(e) => {
            onChange({ target: { name, value: e.target.checked } });
          }}
          checked={value as boolean}
          name={name}
          onLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.on-label',
            defaultMessage: 'On',
          })}
          offLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.off-label',
            defaultMessage: 'Off',
          })}
          {...inputProps}
        />
      );
    }
    case 'select': {
      return (
        <Select
          value={value as string}
          name={name}
          onChange={(value) => onChange({ target: { name, value } })}
          {...inputProps}
        >
          {options?.map((option) => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      );
    }
    default:
      return null;
  }
};

export { GenericInput };
