/*
 *
 * LanguageProvider
 *
 * this component connects the redux state language locale to the
 * IntlProvider component and i18n messages (loaded from `app/translations`)
 */

import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import defaultsDeep from 'lodash/defaultsDeep';
import LocalesProvider from '../LocalesProvider';
import init from './init';
import reducer, { initialState } from './reducer';

const LanguageProvider = ({ children, localesNativeNames, messages }) => {
  const [{ locale }, dispatch] = useReducer(reducer, initialState, () => init(localesNativeNames));

  const changeLocale = locale => {
    dispatch({
      type: 'CHANGE_LOCALE',
      locale,
    });
  };

  const appMessages = defaultsDeep(messages[locale], messages.en);

  return (
    <IntlProvider locale={locale} defaultLocale="en" messages={appMessages} textComponent="span">
      <LocalesProvider
        changeLocale={changeLocale}
        localesNativeNames={localesNativeNames}
        messages={appMessages}
      >
        {React.Children.only(children)}
      </LocalesProvider>
    </IntlProvider>
  );
};

LanguageProvider.propTypes = {
  children: PropTypes.element.isRequired,
  localesNativeNames: PropTypes.object.isRequired,
  messages: PropTypes.object.isRequired,
};

export default LanguageProvider;
