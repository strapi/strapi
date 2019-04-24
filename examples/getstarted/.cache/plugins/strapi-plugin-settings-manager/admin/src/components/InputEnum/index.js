/**
 *
 * InputEnum
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { map } from 'lodash';
import styles from './styles.scss';

/* eslint-disable react/require-default-props  */
class InputEnum extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    const customBootstrapClass = this.props.customBootstrapClass
      ? this.props.customBootstrapClass
      : 'col-md-6';

    return (
      <div className={`${styles.stminputEnum} ${customBootstrapClass}`}>
        <div className={styles.stmenumLabel}>
          <FormattedMessage id={`settings-manager.${this.props.name}`} />
        </div>
        <div className="btn-group" data-toggle="buttons">
          {map(this.props.selectOptions, (option, key) => {
            const isChecked = this.props.value === option.value;
            const active = isChecked ? styles.stmactive : '';
            return (
              <label
                className={`btn ${styles.stmbutton} ${active}`}
                key={key}
                htmlFor={option.name}
              >
                <FormattedMessage id={`settings-manager.${option.name}`} />
                <input
                  type="radio"
                  name={this.props.target}
                  id={option.name}
                  checked={isChecked}
                  autoComplete="off"
                  value={option.value}
                  onChange={this.props.handleChange}
                />
              </label>
            );
          })}
        </div>
      </div>
    );
  }
}

InputEnum.propTypes = {
  customBootstrapClass: PropTypes.string,
  handleChange: PropTypes.func,
  name: PropTypes.string,
  selectOptions: PropTypes.array,
  target: PropTypes.string,
  value: PropTypes.any,
};

export default InputEnum;
