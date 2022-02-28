import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQueryParams } from '@strapi/helper-plugin';
import { useRouteMatch } from 'react-router-dom';
import get from 'lodash/get';
import { Select, Option } from '@strapi/design-system/Select';
import { useIntl } from 'react-intl';
import useContentTypePermissions from '../../hooks/useContentTypePermissions';
import useHasI18n from '../../hooks/useHasI18n';
import selectI18NLocales from '../../selectors/selectI18nLocales';
import getInitialLocale from '../../utils/getInitialLocale';
import getTrad from '../../utils/getTrad';

const LocalePicker = () => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const locales = useSelector(selectI18NLocales);
  const [{ query }, setQuery] = useQueryParams();
  const {
    params: { slug },
  } = useRouteMatch('/content-manager/collectionType/:slug');
  const isFieldLocalized = useHasI18n();
  const { createPermissions, readPermissions } = useContentTypePermissions(slug);

  const initialLocale = getInitialLocale(query, locales);
  const [selected, setSelected] = useState(initialLocale?.code || '');

  if (!isFieldLocalized) {
    return null;
  }

  if (!locales || locales.length === 0) {
    return null;
  }

  const displayedLocales = locales.filter(locale => {
    const canCreate = createPermissions.find(({ properties }) => {
      return get(properties, 'locales', []).includes(locale.code);
    });
    const canRead = readPermissions.find(({ properties }) =>
      get(properties, 'locales', []).includes(locale.code)
    );

    return canCreate || canRead;
  });

  const handleClick = code => {
    if (code === selected) {
      return;
    }

    dispatch({ type: 'ContentManager/RBACManager/RESET_PERMISSIONS' });

    setSelected(code);

    setQuery({
      plugins: { ...query.plugins, i18n: { locale: code } },
    });
  };

  return (
    <Select
      size="S"
      aria-label={formatMessage({ id: getTrad('actions.select-locale'), defaultMessage: '' })}
      value={selected}
      onChange={handleClick}
    >
      {displayedLocales.map(locale => (
        <Option key={locale.id} id={`menu-item${locale.name || locale.code}`} value={locale.code}>
          {locale.name}
        </Option>
      ))}
    </Select>
  );
};

export default LocalePicker;
