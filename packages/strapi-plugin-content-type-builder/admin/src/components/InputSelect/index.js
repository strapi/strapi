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
  componentDidMount() {
    // init the select value
    if (this.props.selectOptions[0].value !== '') {
      const target = { name: this.props.target, value: this.props.selectOptions[0].value  };
      this.props.handleChange({ target });
    }
  }

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
            <FormattedMessage {...{id: option.name}} key={key}>
              {(message) => (
                <option value={option.value}>
                  {message}
                </option>
              )}
            </FormattedMessage>
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
  selectOptions: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.object, // TODO remove
  ]),
  target: React.PropTypes.string,
  value: React.PropTypes.string,
};

export default InputSelect;
