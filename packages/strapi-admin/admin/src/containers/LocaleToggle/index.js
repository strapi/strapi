/*
 *
 * LanguageToggle
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';

import { selectLocale } from 'containers/LanguageProvider/selectors';
import { changeLocale } from 'containers/LanguageProvider/actions';
import { languages } from 'i18n';

import styles from './styles.scss';

export class LocaleToggle extends React.Component { // eslint-disable-line
  state = { isOpen: false };

  getFlagUrl = (locale) => {
    switch (locale) {
      case 'en':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/us.svg';
      case 'zh':
      case 'zh-Hans':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/cn.svg';
      default:
        return `https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/${locale}.svg`;
    }
  }

  toggle = () => this.setState(prevState => ({ isOpen: !prevState.isOpen }));

  render() {
    const { locale } = this.props;
    // const messages = languages.reduce((result, locale) => {
    //   const resultsObj = result;
    //   resultsObj[locale] = locale.toUpperCase();
    //   return resultsObj;
    // }, {});

    return (
      <div className={styles.localeToggle}>
        <ButtonDropdown isOpen={this.state.isOpen} toggle={this.toggle}>
          <DropdownToggle className={styles.localeDropdownContent}>
            <span>{locale}</span>
            <img src={this.getFlagUrl(locale)} alt={locale} />
          </DropdownToggle>
          <DropdownMenu className={styles.localeDropdownMenu}>
            {languages.map(language => (
              <DropdownItem key={language} onClick={() => this.props.onLocaleToggle(language)} className={styles.localeToggleItem}>
                {language}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </ButtonDropdown>
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
    onLocaleToggle: (locale) => dispatch(changeLocale(locale)),
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(LocaleToggle);
