import { SingleSelectOption, SingleSelect, Field } from '@strapi/design-system';
import { useIntl } from 'react-intl';

type SelectNumberProps = {
  intlLabel: {
    id: string;
    defaultMessage: string;
    values?: object;
  };
  error?: string;
  modifiedData: {
    default: number;
    max: number;
    min: number;
  };
  name: string;
  onChange: (value: {
    target: {
      name: string;
      value: string | number | null;
      type?: string;
    };
  }) => void;
  options: Array<{
    metadatas: {
      intlLabel: {
        id: string;
        defaultMessage: string;
      };
      disabled?: boolean;
      hidden?: boolean;
    };
    key: string | number;
    value: string | number;
  }>;
  value?: string;
};

export const SelectNumber = ({
  intlLabel,
  error = undefined,
  modifiedData,
  name,
  onChange,
  options,
  value = '',
}: SelectNumberProps) => {
  const { formatMessage } = useIntl();
  const label = formatMessage(intlLabel);
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  const handleChange = (nextValue: string | number) => {
    onChange({ target: { name, value: nextValue, type: 'select' } });

    if (!value) {
      return;
    }

    if (nextValue === 'biginteger' && value !== 'biginteger') {
      if (modifiedData.default !== undefined && modifiedData.default !== null) {
        onChange({ target: { name: 'default', value: null } });
      }

      if (modifiedData.max !== undefined && modifiedData.max !== null) {
        onChange({ target: { name: 'max', value: null } });
      }

      if (modifiedData.min !== undefined && modifiedData.min !== null) {
        onChange({ target: { name: 'min', value: null } });
      }
    }

    if (
      typeof nextValue === 'string' &&
      ['decimal', 'float', 'integer'].includes(nextValue) &&
      value === 'biginteger'
    ) {
      if (modifiedData.default !== undefined && modifiedData.default !== null) {
        onChange({ target: { name: 'default', value: null } });
      }

      if (modifiedData.max !== undefined && modifiedData.max !== null) {
        onChange({ target: { name: 'max', value: null } });
      }

      if (modifiedData.min !== undefined && modifiedData.min !== null) {
        onChange({ target: { name: 'min', value: null } });
      }
    }
  };

  return (
    <Field.Root error={errorMessage} name={name}>
      <Field.Label>{label}</Field.Label>
      <SingleSelect onChange={handleChange} value={value || ''}>
        {options.map(({ metadatas: { intlLabel, disabled, hidden }, key, value }) => {
          return (
            <SingleSelectOption key={key} value={value} disabled={disabled} hidden={hidden}>
              {formatMessage(intlLabel)}
            </SingleSelectOption>
          );
        })}
      </SingleSelect>
      <Field.Error />
    </Field.Root>
  );
};

SelectNumber.defaultProps = {
  error: undefined,
  value: '',
};
