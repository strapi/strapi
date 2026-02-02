import { Field, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { PrimitiveType, useIntl } from 'react-intl';

type SelectDateTypeProps = {
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
        values: Record<string, PrimitiveType> | undefined;
      };
      disabled?: boolean;
      hidden?: boolean;
    };
    key: string | number;
    value: string | number;
  }>;
  value?: string;
};

export const SelectDateType = ({
  intlLabel,
  error = undefined,
  modifiedData,
  name,
  onChange,
  options,
  value = '',
}: SelectDateTypeProps) => {
  const { formatMessage } = useIntl();
  const label = formatMessage(intlLabel);
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  const handleChange = (nextValue: string | number) => {
    onChange({ target: { name, value: nextValue, type: 'select' } });

    if (!value) {
      return;
    }

    if (modifiedData.default !== undefined && modifiedData.default !== null) {
      onChange({ target: { name: 'default', value: null } });
    }
  };

  return (
    <Field.Root error={errorMessage} name={name}>
      <Field.Label>{label}</Field.Label>
      <SingleSelect onChange={handleChange} value={value || ''}>
        {options.map(({ metadatas: { intlLabel, disabled, hidden }, key, value }) => {
          return (
            <SingleSelectOption key={key} value={value} disabled={disabled} hidden={hidden}>
              {formatMessage(
                { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
                intlLabel.values
              )}
            </SingleSelectOption>
          );
        })}
      </SingleSelect>
      <Field.Error />
    </Field.Root>
  );
};
