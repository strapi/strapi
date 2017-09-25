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
    const requiredClass = this.props.validations.required && this.props.addRequiredInputDesign ? styles.requiredClass : '';

    return (
      <div className={`${styles.inputSelect} ${requiredClass} ${bootStrapClass}`}>
        <label htmlFor={this.props.name}>
          <FormattedMessage id={`settings-manager.${this.props.name}`} />
        </label>
        <select
          className="form-control"
          id={this.props.name}
          name={this.props.target}
          onChange={this.props.handleChange}
          value={this.props.value}
        >
          {map(this.props.selectOptions, (option, key) => (
            <FormattedMessage id={`settings-manager.${option.name}`} key={key}>
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
  addRequiredInputDesign: React.PropTypes.bool.isRequired,
  customBootstrapClass: React.PropTypes.string.isRequired,
  handleChange: React.PropTypes.func.isRequired,
  name: React.PropTypes.string.isRequired,
  selectOptions: React.PropTypes.oneOfType([
    React.PropTypes.array.isRequired,
    React.PropTypes.object.isRequired, // TODO remove
  ]).isRequired,
  target: React.PropTypes.string.isRequired,
  validations: React.PropTypes.object.isRequired,
  value: React.PropTypes.string.isRequired,
};

export default InputSelect;
