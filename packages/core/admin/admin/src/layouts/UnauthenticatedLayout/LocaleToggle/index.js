/*
 *
 * LanguageToggle
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import useLocalesProvider from '../../../components/LocalesProvider/useLocalesProvider';

const LocaleToggle = () => {
  const { changeLocale, localeNames } = useLocalesProvider();
  const { locale } = useIntl();

  return (
    <SimpleMenu label={localeNames[locale]}>
      {Object.keys(localeNames).map(lang => (
        <MenuItem onClick={() => changeLocale(lang)} key={lang}>
          {localeNames[lang]}
        </MenuItem>
      ))}
    </SimpleMenu>
  );
};

export default LocaleToggle;
