import { Textarea, TextareaProps } from '@strapi/design-system';
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
    <Textarea
      label={formatMessage({
        id: 'Settings.tokens.form.description',
        defaultMessage: 'Description',
      })}
      id="description"
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
      onChange={onChange}
      disabled={!canEditInputs}
    >
      {value}
    </Textarea>
  );
};
