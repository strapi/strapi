import { Field, Textarea, TextareaProps } from '@strapi/design-system';
import { MessageDescriptor, useIntl } from 'react-intl';

import { isErrorMessageMessageDescriptor } from '../../utils/forms';

interface TokenDescriptionProps extends Pick<TextareaProps, 'onChange' | 'value'> {
  error?: string | MessageDescriptor;
  canEditInputs: boolean;
}

export const TokenDescription = ({
  error,
  value,
  onChange,
  canEditInputs,
}: TokenDescriptionProps) => {
  const { formatMessage } = useIntl();

  return (
    <Field.Root
      name="description"
      error={
        error
          ? formatMessage(
              isErrorMessageMessageDescriptor(error)
                ? error
                : {
                    id: error,
                    defaultMessage: error,
                  }
            )
          : undefined
      }
    >
      <Field.Label>
        {formatMessage({
          id: 'Settings.tokens.form.description',
          defaultMessage: 'Description',
        })}
      </Field.Label>
      <Textarea onChange={onChange} disabled={!canEditInputs} value={value} />
      <Field.Error />
    </Field.Root>
  );
};
