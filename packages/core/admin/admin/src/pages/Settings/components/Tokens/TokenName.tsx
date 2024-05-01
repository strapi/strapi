import { Field, FieldError, FieldLabel, TextInput, TextInputProps } from '@strapi/design-system';
import { MessageDescriptor, useIntl } from 'react-intl';

import { isErrorMessageMessageDescriptor } from '../../utils/forms';

interface TokenNameProps extends Pick<TextInputProps, 'onChange' | 'value'> {
  error?: string | MessageDescriptor;
  canEditInputs: boolean;
}

export const TokenName = ({ error, value, onChange, canEditInputs }: TokenNameProps) => {
  const { formatMessage } = useIntl();

  return (
    <Field
      name="name"
      error={
        error
          ? formatMessage(
              isErrorMessageMessageDescriptor(error) ? error : { id: error, defaultMessage: error }
            )
          : undefined
      }
      required
    >
      <FieldLabel>
        {formatMessage({
          id: 'Settings.tokens.form.name',
          defaultMessage: 'Name',
        })}
      </FieldLabel>
      <TextInput onChange={onChange} value={value} disabled={!canEditInputs} />
      <FieldError />
    </Field>
  );
};
