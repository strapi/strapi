import { PLUGIN_ID } from '../../../shared/constants';
import {
  MessageDescriptor,
  useIntl
} from 'react-intl';
import { FormatXMLElementFn, PrimitiveType } from 'intl-messageformat';
import { ReactNode } from 'react';
import { Options as IntlMessageFormatOptions } from 'intl-messageformat';


export const getTrad = (id: string | undefined) => `${PLUGIN_ID}.${id}`;
export const useTranslation = () => {
  const intl = useIntl();

  function formatMessage(
    descriptor: MessageDescriptor,
    values?: Record<string, PrimitiveType | FormatXMLElementFn<string, string>>,
    opts?: IntlMessageFormatOptions
  ) : string;
  function formatMessage(
    descriptor: MessageDescriptor,
    values?: Record<string, ReactNode | PrimitiveType | FormatXMLElementFn<string, ReactNode>>,
    opts?: IntlMessageFormatOptions
  ): string | ReactNode {
    const formattedMessage = intl.formatMessage(
      { ...descriptor, id: getTrad(descriptor.id) },
      values,
      opts
    );
    return formattedMessage;
  };

  return {
    ...intl,
    formatMessage: formatMessage
  };
}
