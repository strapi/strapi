import { SingleSelectOption, SingleSelect, SingleSelectProps, Field } from '@strapi/design-system';
import { MessageDescriptor, useIntl } from 'react-intl';

import { isErrorMessageMessageDescriptor } from '../../utils/forms';

interface TokenTypeSelectProps extends Pick<SingleSelectProps, 'onChange' | 'value'> {
  name?: string;
  options: Array<{
    label: MessageDescriptor;
    value: string;
  }>;
  error?: string | MessageDescriptor;
  canEditInputs: boolean;
  label: MessageDescriptor;
}

export const TokenTypeSelect = ({
  name = 'type',
  error,
  value,
  onChange,
  canEditInputs,
  options = [],
  label,
}: TokenTypeSelectProps) => {
  const { formatMessage } = useIntl();

  return (
    <Field.Root
      error={
        error
          ? formatMessage(
              isErrorMessageMessageDescriptor(error) ? error : { id: error, defaultMessage: error }
            )
          : undefined
      }
      name={name}
      required
    >
      <Field.Label>
        {formatMessage({
          id: label.id,
          defaultMessage: label.defaultMessage,
        })}
      </Field.Label>
      <SingleSelect
        value={value}
        onChange={onChange}
        placeholder="Select"
        disabled={!canEditInputs}
      >
        {options &&
          options.map(({ value, label }) => (
            <SingleSelectOption key={value} value={value}>
              {formatMessage(label)}
            </SingleSelectOption>
          ))}
      </SingleSelect>
      <Field.Error />
    </Field.Root>
  );
};
