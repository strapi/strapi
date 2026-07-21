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

  const warnedKeysRef = React.useRef(new Set<string>());

  const shouldLogMissingTranslations =
    process.env.NODE_ENV !== 'production' &&
    process.env.STRAPI_ADMIN_LOG_MISSING_TRANSLATIONS === 'true';

  const handleIntlError = React.useCallback(
    (err: Parameters<NonNullable<React.ComponentProps<typeof IntlProvider>['onError']>>[0]) => {
      if (err.code === ReactIntlErrorCode.MISSING_TRANSLATION) {
        if (shouldLogMissingTranslations && !warnedKeysRef.current.has(err.message)) {
          warnedKeysRef.current.add(err.message);

          console.warn(
            `[react-intl] Missing translation detected. English fallback message is being used. ${err.message} ` +
              'Set STRAPI_ADMIN_LOG_MISSING_TRANSLATIONS=true to see these warnings (dev only).'
          );
        }

        return;
      }

      console.error(err);
    },
    [shouldLogMissingTranslations]
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