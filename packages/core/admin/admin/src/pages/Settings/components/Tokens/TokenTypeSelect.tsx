import { SingleSelectOption, SingleSelect, SingleSelectProps } from '@strapi/design-system';
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
    <SingleSelect
      name={name}
      label={formatMessage({
        id: label.id,
        defaultMessage: label.defaultMessage,
      })}
      value={value}
      error={
        error
          ? formatMessage(
              isErrorMessageMessageDescriptor(error) ? error : { id: error, defaultMessage: error }
            )
          : undefined
      }
      onChange={onChange}
      placeholder="Select"
      required
      disabled={!canEditInputs}
    >
      {options &&
        options.map(({ value, label }) => (
          <SingleSelectOption key={value} value={value}>
            {formatMessage(label)}
          </SingleSelectOption>
        ))}
    </SingleSelect>
  );
};
