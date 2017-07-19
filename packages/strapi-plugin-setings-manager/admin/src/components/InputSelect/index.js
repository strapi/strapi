/**
*
* InputSelect
*
*/

import React from 'react';
import { map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class InputSelect extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const bootStrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-6';
    return (
      <div className={`${styles.inputSelect} ${bootStrapClass}`}>
        <label htmlFor={this.props.name}>
          <FormattedMessage {...{id: this.props.name}} />
        </label>
        <select
          className="form-control"
          id={this.props.name}
          name={this.props.target}
          onChange={this.props.handleChange}
          value={this.props.value}
        >
          {map(this.props.selectOptions, (option, key) => (
            <option key={key} value={option.value}>
              <FormattedMessage {...{id: option.name}} />
            </option>
          ))}
        </select>
      </div>
    );
  }
}

InputSelect.propTypes = {
  customBootstrapClass: React.PropTypes.string,
  handleChange: React.PropTypes.func.isRequired,
  name: React.PropTypes.string.isRequired,
  selectOptions: React.PropTypes.array,
  target: React.PropTypes.string,
  value: React.PropTypes.string,
};

export default InputSelect;
