import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useI18n } from '../hooks/useI18n';
import { useGetLocalesQuery } from '../services/locales';
import { getTranslation } from '../utils/getTranslation';

import type { I18nBaseQuery } from '../types';

interface Query extends I18nBaseQuery {
  page?: number;
}

const LocalePicker = () => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams<Query>();

  const { hasI18n, canRead, canCreate } = useI18n();
  const { data: locales = [] } = useGetLocalesQuery(undefined, {
    skip: !hasI18n,
  });

  const handleChange = React.useCallback(
    (code: string, replace = false) => {
      setQuery(
        {
          page: 1,
          plugins: { ...query.plugins, i18n: { locale: code } },
        },
        'push',
        replace
      );
    },
    [query.plugins, setQuery]
  );

  React.useEffect(() => {
    if (!Array.isArray(locales) || !hasI18n) {
      return;
    }
    /**
     * Handle the case where the current locale query param doesn't exist
     * in the list of available locales, so we redirect to the default locale.
     */
    const currentDesiredLocale = query.plugins?.i18n?.locale;
    const doesLocaleExist = locales.find((loc) => loc.code === currentDesiredLocale);
    const defaultLocale = locales.find((locale) => locale.isDefault);
    if (!doesLocaleExist && defaultLocale?.code) {
      handleChange(defaultLocale.code, true);
    }
  }, [hasI18n, handleChange, locales, query.plugins?.i18n?.locale]);

  if (!hasI18n || !Array.isArray(locales) || locales.length === 0) {
    return null;
  }

  const displayedLocales = locales.filter((locale) => {
    /**
     * If you can create or read we allow you to see the locale exists
     * this is because in the ListView, you may be able to create a new entry
     * in a locale you can't read.
     */
    return canCreate.includes(locale.code) || canRead.includes(locale.code);
  });

  return (
    <SingleSelect
      size="S"
      aria-label={formatMessage({
        id: getTranslation('actions.select-locale'),
        defaultMessage: 'Select locale',
      })}
      value={query.plugins?.i18n?.locale || locales.find((locale) => locale.isDefault)?.code}
      // @ts-expect-error – This can be removed in V2 of the DS.
      onChange={handleChange}
    >
      {displayedLocales.map((locale) => (
        <SingleSelectOption key={locale.id} value={locale.code}>
          {locale.name}
        </SingleSelectOption>
      ))}
    </SingleSelect>
  );
};

export { LocalePicker };
