import * as React from 'react';

import defaultsDeep from 'lodash/defaultsDeep';
import { IntlProvider, ReactIntlErrorCode } from 'react-intl';

import { useTypedSelector } from '../core/store/hooks';

/* -------------------------------------------------------------------------------------------------
 * LanguageProvider
 * -----------------------------------------------------------------------------------------------*/

interface LanguageProviderProps {
  children: React.ReactNode;
  messages: Record<string, Record<string, string>>;
}

const LanguageProvider = ({ children, messages }: LanguageProviderProps) => {
  const locale = useTypedSelector((state) => state.admin_app.language.locale);
  const appMessages = defaultsDeep(messages[locale], messages.en);

  const handleIntlError = React.useCallback(
    (err: Parameters<NonNullable<React.ComponentProps<typeof IntlProvider>['onError']>>[0]) => {
      if (err.code === ReactIntlErrorCode.MISSING_TRANSLATION) {
        return;
      }
      console.error(err);
    },
    []
  );

  return (
    <IntlProvider
      locale={locale}
      defaultLocale="en"
      messages={appMessages}
      textComponent="span"
      onError={handleIntlError}
    >
      {children}
    </IntlProvider>
  );
};

export { LanguageProvider };
export type { LanguageProviderProps };
