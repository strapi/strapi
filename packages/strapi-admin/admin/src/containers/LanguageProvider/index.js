/*
 *
 * LanguageProvider
 *
 * this component connects the redux state language locale to the
 * IntlProvider component and i18n messages (loaded from `app/translations`)
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { IntlProvider } from 'react-intl';
import { defaultsDeep } from 'lodash';
import { selectLocale } from './selectors';

// eslint-disable-next-line react/prefer-stateless-function
export class LanguageProvider extends React.Component {
  render() {
    const messages = defaultsDeep(
      this.props.messages[this.props.locale],
      this.props.messages.en
    );

    return (
      <IntlProvider
        locale={this.props.locale}
        defaultLocale="en"
        messages={messages}
      >
        {React.Children.only(this.props.children)}
      </IntlProvider>
    );
  }
}

LanguageProvider.propTypes = {
  children: PropTypes.element.isRequired,
  locale: PropTypes.string.isRequired,
  messages: PropTypes.object.isRequired,
};

const mapStateToProps = createSelector(selectLocale(), locale => ({ locale }));

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(LanguageProvider);
