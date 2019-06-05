/**
 *
 * InputSelect
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

/* eslint-disable react/require-default-props  */
class InputSelect extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    // Init the select value
    if (this.props.selectOptions[0].value !== '' && isEmpty(this.props.value)) {
      const target = {
        name: this.props.target,
        value: this.props.selectOptions[0].value,
      };
      this.props.handleChange({ target });
    }
  }

  render() {
    const bootStrapClass = this.props.customBootstrapClass
      ? this.props.customBootstrapClass
      : 'col-md-6';
    const requiredClass =
      this.props.validations.required && this.props.addRequiredInputDesign
        ? styles.stmrequiredClass
        : '';

    return (
      <div className={`${styles.stminput} ${requiredClass} ${bootStrapClass}`}>
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
          {map(this.props.selectOptions, (option, key) =>
            option.name ? (
              <FormattedMessage
                id={`settings-manager.${option.name}`}
                key={key}
              >
                {message => <option value={option.value}>{message}</option>}
              </FormattedMessage>
            ) : (
              <option value={option.value} key={key}>
                {option.name}
              </option>
            ),
          )}
        </select>
      </div>
    );
  }
}

InputSelect.propTypes = {
  addRequiredInputDesign: PropTypes.bool,
  customBootstrapClass: PropTypes.string,
  handleChange: PropTypes.func,
  name: PropTypes.string,
  selectOptions: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  target: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.string,
};

export default InputSelect;
