/**
*
* SelectOption
*
*/

import React from 'react';
import getFlag, { formatLanguageLocale } from '../../utils/getFlag';
import styles from './styles.scss';

class SelectOptionLanguage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  onSelect =  (event) => {
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
      <div className={styles.selectOption} onMouseEnter={this.handleMouseEnter} onMouseMove={this.handleMouseMove} onFocus={this.props.onFocus} onClick={this.onSelect} id={this.props.option.value}>
        <span className={`${styles.flagContainer} flag-icon flag-icon-${flag}`} />
        <span className={styles.optionLabel}>{this.props.option.label}</span>
      </div>
    );
  }
}

SelectOptionLanguage.propTypes = {
  isFocused: React.PropTypes.bool,
  onFocus: React.PropTypes.func,
  onSelect: React.PropTypes.func,
  option: React.PropTypes.object.isRequired,
};

export default SelectOptionLanguage;
