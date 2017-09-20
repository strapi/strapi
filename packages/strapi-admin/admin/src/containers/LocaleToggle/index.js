/*
 *
 * LanguageToggle
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import Toggle from 'components/Toggle';
import { selectLocale } from 'containers/LanguageProvider/selectors';
import { changeLocale } from 'containers/LanguageProvider/actions';
import { languages } from 'i18n';

import styles from './styles.scss';

export class LocaleToggle extends React.Component { // eslint-disable-line
  render() {
    const messages = languages.reduce((result, locale) => {
      const resultsObj = result;
      resultsObj[locale] = locale.toUpperCase();
      return resultsObj;
    }, {});

    return (
      <div className={styles.localeToggle}>
        <Toggle values={languages} value={this.props.locale} messages={messages} onToggle={this.props.onLocaleToggle} />
      </div>
    );
  }
}

LocaleToggle.propTypes = {
  locale: PropTypes.string.isRequired,
  onLocaleToggle: PropTypes.func.isRequired,
};

const mapStateToProps = createSelector(
  selectLocale(),
  (locale) => ({ locale })
);

export function mapDispatchToProps(dispatch) {
  return {
    onLocaleToggle: (evt) => dispatch(changeLocale(evt.target.value)),
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(LocaleToggle);
