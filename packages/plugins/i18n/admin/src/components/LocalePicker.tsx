import { SingleSelect, SingleSelectOption, SingleSelectProps } from '@strapi/design-system';
import { useQueryParams } from '@strapi/helper-plugin';
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

  // @ts-expect-error – This can be removed in V2 of the DS.
  const handleChange: SingleSelectProps['onChange'] = (code: string) => {
    setQuery({
      page: 1,
      plugins: { ...query.plugins, i18n: { locale: code } },
    });
  };

  return (
    <SingleSelect
      size="S"
      aria-label={formatMessage({
        id: getTranslation('actions.select-locale'),
        defaultMessage: 'Select locale',
      })}
      value={query.plugins?.i18n?.locale || locales.find((locale) => locale.isDefault)?.code}
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
