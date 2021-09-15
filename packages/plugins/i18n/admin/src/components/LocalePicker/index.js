import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQueryParams } from '@strapi/helper-plugin';
import { useRouteMatch } from 'react-router-dom';
import get from 'lodash/get';
import { Box } from '@strapi/parts/Box';
import { SimpleMenu, MenuItem } from '@strapi/parts/SimpleMenu';
import { ButtonText } from '@strapi/parts/Text';
import useContentTypePermissions from '../../hooks/useContentTypePermissions';
import useHasI18n from '../../hooks/useHasI18n';
import selectI18NLocales from '../../selectors/selectI18nLocales';
import getInitialLocale from '../../utils/getInitialLocale';

const LocalePicker = () => {
  const dispatch = useDispatch();
  const locales = useSelector(selectI18NLocales);
  const [{ query }, setQuery] = useQueryParams();
  const {
    params: { slug },
  } = useRouteMatch('/content-manager/collectionType/:slug');
  const isFieldLocalized = useHasI18n();
  const { createPermissions, readPermissions } = useContentTypePermissions(slug);

  const initialLocale = getInitialLocale(query, locales);
  const [selected, setSelected] = useState(initialLocale);

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

  const hasMultipleLocales = displayedLocales.length > 1;

  const handleClick = locale => {
    dispatch({ type: 'ContentManager/RBACManager/RESET_PERMISSIONS' });
    setSelected(locale);

    setQuery({
      plugins: { ...query.plugins, i18n: { locale: locale.code } },
    });
  };

  if (!hasMultipleLocales) {
    return (
      <Box
        background="neutral0"
        shadow="filterShadow"
        paddingTop={2}
        paddingBottom={2}
        paddingLeft={4}
        paddingRight={4}
        hasRadius
      >
        <ButtonText>{selected.name}</ButtonText>
      </Box>
    );
  }

  return (
    <Box
      background="neutral0"
      shadow="filterShadow"
      paddingTop={2}
      paddingBottom={2}
      paddingLeft={4}
      paddingRight={4}
      hasRadius
    >
      <SimpleMenu id="label" label={selected.name}>
        {displayedLocales.map(locale => {
          if (locale.id === selected.id) {
            return null;
          }

          return (
            <MenuItem
              key={locale.id}
              id={`menu-item${locale.name || locale.code}`}
              onClick={() => handleClick(locale)}
            >
              {locale.name || locale.code}
            </MenuItem>
          );
        })}
      </SimpleMenu>
    </Box>
  );
};

export default LocalePicker;
