/*
 *
 * LanguageToggle
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { bindActionCreators } from 'redux';
import cn from 'classnames';

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
      case 'ar':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/sa.svg';
      default:
        return `https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/${locale}.svg`;
    }
  }

  toggle = () => this.setState(prevState => ({ isOpen: !prevState.isOpen }));

  render() {
    const { locale } = this.props;

    return (
      <div className={styles.localeToggle}>
        <ButtonDropdown isOpen={this.state.isOpen} toggle={this.toggle}>
          <DropdownToggle className={styles.localeDropdownContent}>
            <span>{locale}</span>
            <img src={this.getFlagUrl(locale)} alt={locale} />
          </DropdownToggle>
          <DropdownMenu className={cn(styles.localeDropdownMenu, this.props.isLogged ? '' : styles.localeDropdownMenuNotLogged)}>
            {languages.map(language => (
              <DropdownItem key={language} onClick={() => this.props.changeLocale(language)} className={cn(styles.localeToggleItem, locale === language ? styles.localeToggleItemActive : '')}>
                {language.toUpperCase()}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </ButtonDropdown>
      </div>
    );
  }
}



LocaleToggle.propTypes = {
  changeLocale: PropTypes.func.isRequired,
  isLogged: PropTypes.bool.isRequired,
  locale: PropTypes.string.isRequired,
};

const mapStateToProps = createSelector(
  selectLocale(),
  (locale) => ({ locale })
);

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      changeLocale,
    },
    dispatch,
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(LocaleToggle);
