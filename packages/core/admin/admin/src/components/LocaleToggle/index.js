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
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import translationMessages, { languageNativeNames } from '../../translations';
import makeSelectLocale from '../LanguageProvider/selectors';
import { changeLocale } from '../LanguageProvider/actions';
import Wrapper from './Wrapper';

// TODO
const languages = Object.keys(translationMessages);
export class LocaleToggle extends React.Component {
  // eslint-disable-line
  state = { isOpen: false };

  toggle = () => this.setState(prevState => ({ isOpen: !prevState.isOpen }));

  render() {
    const {
      currentLocale: { locale },
    } = this.props;

    return (
      <Wrapper>
        <ButtonDropdown isOpen={this.state.isOpen} toggle={this.toggle}>
          <DropdownToggle className="localeDropdownContent">
            <span>{languageNativeNames[locale]}</span>
          </DropdownToggle>

          <DropdownMenu className="localeDropdownMenu">
            {languages.map(language => (
              <DropdownItem
                key={language}
                onClick={() => this.props.changeLocale(language)}
                className={cn(
                  'localeToggleItem',
                  locale === language ? 'localeToggleItemActive' : ''
                )}
              >
                {languageNativeNames[language]}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </ButtonDropdown>
      </Wrapper>
    );
  }
}

LocaleToggle.propTypes = {
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

const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(withConnect)(LocaleToggle);
