/*
 *
 * LanguageToggle
 *
 */

import React from 'react';

import { SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import useLocalesProvider from '../../../components/LocalesProvider/useLocalesProvider';

const LocaleToggle = () => {
  const { changeLocale, localeNames } = useLocalesProvider();
  const { locale } = useIntl();

  return (
    <SingleSelect value={locale} onChange={(language) => changeLocale(language)}>
      {Object.entries(localeNames).map(([language, name]) => (
        <SingleSelectOption key={language} value={language}>
          {name}
        </SingleSelectOption>
      ))}
    </SingleSelect>
  );
};

export default LocaleToggle;
