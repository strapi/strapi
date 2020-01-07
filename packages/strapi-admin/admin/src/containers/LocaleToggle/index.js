/*
 *
 * LanguageToggle
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import cn from 'classnames';
import {
  ButtonDropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
} from 'reactstrap';
import makeSelectLocale from '../LanguageProvider/selectors';
import { changeLocale } from '../LanguageProvider/actions';
import { languages } from '../../i18n';
import Wrapper from './Wrapper';

export class LocaleToggle extends React.Component {
  // eslint-disable-line
  state = { isOpen: false };

  getFlagUrl = locale => {
    switch (locale) {
      case 'en':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/us.svg';
      case 'pt-BR':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/br.svg';
      case 'zh':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/tw.svg';
      case 'zh-Hans':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/cn.svg';
      case 'ar':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/sa.svg';
      case 'ko':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/kr.svg';
      case 'ja':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/jp.svg';
      case 'vi':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/vn.svg';
      case 'sk':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/sk.svg';
      case 'cs':
        return 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/cz.svg';
      default:
        return `https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/${locale}.svg`;
    }
  };

  toggle = () => this.setState(prevState => ({ isOpen: !prevState.isOpen }));

  render() {
    const {
      currentLocale: { locale },
      className,
    } = this.props;
    const style = cn('localeDropdownMenu', className);

    return (
      <Wrapper>
        <ButtonDropdown isOpen={this.state.isOpen} toggle={this.toggle}>
          <DropdownToggle className="localeDropdownContent">
            <span>{locale}</span>
            <img src={this.getFlagUrl(locale)} alt={locale} />
          </DropdownToggle>

          <DropdownMenu className={style}>
            {languages.map(language => (
              <DropdownItem
                key={language}
                onClick={() => this.props.changeLocale(language)}
                className={cn(
                  'localeToggleItem',
                  locale === language ? 'localeToggleItemActive' : ''
                )}
              >
                {language.toUpperCase()}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </ButtonDropdown>
      </Wrapper>
    );
  }
}

LocaleToggle.defaultProps = {
  className: null,
};

LocaleToggle.propTypes = {
  className: PropTypes.string,
  changeLocale: PropTypes.func.isRequired,
  currentLocale: PropTypes.object.isRequired,
};

const mapStateToProps = createStructuredSelector({
  currentLocale: makeSelectLocale(),
});

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      changeLocale,
    },
    dispatch
  );
}

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps
);

export default compose(withConnect)(LocaleToggle);
