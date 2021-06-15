/*
 *
 * LanguageToggle
 *
 */

import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import useLocalesProvider from '../LocalesProvider/useLocalesProvider';
import Wrapper from './Wrapper';

const LocaleToggle = () => {
  const { changeLocale, localesNativeNames } = useLocalesProvider();

  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(prev => !prev);
  const { locale } = useIntl();

  return (
    <Wrapper>
      <ButtonDropdown isOpen={isOpen} toggle={toggle}>
        <DropdownToggle className="localeDropdownContent">
          <span>{localesNativeNames[locale]}</span>
        </DropdownToggle>

        <DropdownMenu className="localeDropdownMenu">
          {Object.keys(localesNativeNames).map(lang => {
            return (
              <DropdownItem
                key={lang}
                onClick={() => changeLocale(lang)}
                className={`localeToggleItem ${locale === lang ? 'localeToggleItemActive' : ''}`}
              >
                {localesNativeNames[lang]}
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </ButtonDropdown>
    </Wrapper>
  );
};

export default LocaleToggle;
