/**
*
* SelectOption
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import getFlag, { formatLanguageLocale } from '../../utils/getFlag';
import styles from './styles.scss';

/* eslint-disable react/require-default-props  */
class SelectOptionLanguage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  handleSelect =  (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.props.onSelect(this.props.option, event);
  }

  handleMouseEnter  = (event) => {
    this.props.onFocus(this.props.option, event);
  }

  handleMouseMove  = (event) => {
    if (this.props.isFocused) return;
    this.props.onFocus(this.props.option, event);
  }

  render() {
    const flagName = formatLanguageLocale(this.props.option.value);
    const flag = getFlag(flagName);

    return (
      <div className={styles.selectOption} onMouseEnter={this.handleMouseEnter} onMouseMove={this.handleMouseMove} onFocus={this.props.onFocus} onClick={this.handleSelect} id={this.props.option.value}>
        <span className={`${styles.flagContainer} flag-icon flag-icon-${flag}`} />
        <span className={styles.optionLabel}>{this.props.option.label}</span>
      </div>
    );
  }
}

SelectOptionLanguage.propTypes = {
  isFocused: PropTypes.bool,
  onFocus: PropTypes.func,
  onSelect: PropTypes.func,
  option: PropTypes.object,
};

export default SelectOptionLanguage;
