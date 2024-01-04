import { useState } from 'react';

import { SingleSelect, SingleSelectOption, SingleSelectProps } from '@strapi/design-system';
import { useQueryParams } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useRouteMatch } from 'react-router-dom';

import { useContentTypeHasI18n } from '../hooks/useContentTypeHasI18n';
import { useContentTypePermissions } from '../hooks/useContentTypePermissions';
import { useTypedSelector } from '../store/hooks';
import { getTranslation } from '../utils/getTranslation';
import { getInitialLocale } from '../utils/locales';

import type { I18nBaseQuery } from '../types';

const LocalePicker = () => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const locales = useTypedSelector((state) => state.i18n_locales.locales);
  interface Query extends I18nBaseQuery {
    page?: number;
  }

  const [{ query }, setQuery] = useQueryParams<Query>();
  const match = useRouteMatch<{ slug: string }>('/content-manager/:collectiontype/:slug');
  const isContentTypeLocalized = useContentTypeHasI18n();
  const { createPermissions, readPermissions } = useContentTypePermissions(match?.params.slug);

  const initialLocale = getInitialLocale(query, locales);
  const [selected, setSelected] = useState(initialLocale?.code || '');

  if (!isContentTypeLocalized) {
    return null;
  }

  if (!locales || locales.length === 0) {
    return null;
  }

  const displayedLocales = locales.filter((locale) => {
    const canCreate = createPermissions.some(({ properties }) =>
      (properties?.locales ?? []).includes(locale.code)
    );
    const canRead = readPermissions.some(({ properties }) =>
      (properties?.locales ?? []).includes(locale.code)
    );

    return canCreate || canRead;
  });

  // @ts-expect-error – This can be removed in V2 of the DS.
  const handleChange: SingleSelectProps['onChange'] = (code: string) => {
    if (code === selected) {
      return;
    }

    setSelected(code);

    dispatch({ type: 'ContentManager/RBACManager/RESET_PERMISSIONS' });

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
      value={selected}
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
