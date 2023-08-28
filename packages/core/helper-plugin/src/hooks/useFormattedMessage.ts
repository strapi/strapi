import React from 'react';

import isObject from 'lodash/isObject';
import { useIntl, MessageDescriptor } from 'react-intl';

import type { FormatXMLElementFn } from 'intl-messageformat';

type MessageFormatPrimitiveValue = string | number | boolean | null | undefined;
interface MessageProps {
  message: MessageDescriptor;
  values?: Record<
    string,
    MessageFormatPrimitiveValue | React.ReactElement | FormatXMLElementFn<string, string>
  >;
}

const useFormattedMessage = ({ message }: MessageProps) => {
  const { formatMessage } = useIntl();

  if (isObject(message) && message.id) {
    return formatMessage({
      ...message,
      defaultMessage: message.defaultMessage || message.id,
    });
  }

  return message;
};

export { useFormattedMessage };
