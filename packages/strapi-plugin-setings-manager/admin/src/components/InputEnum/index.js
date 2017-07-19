/**
*
* InputEnum
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { map } from 'lodash';
import styles from './styles.scss';

class InputEnum extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const customBootstrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-6';

    return (
      <div className={`${styles.inputEnum} ${customBootstrapClass}`}>
        <div className={styles.enumLabel}>
          <FormattedMessage {...{id: this.props.name}} />
        </div>
        <div className="btn-group" data-toggle="buttons">
          {map(this.props.selectOptions, (option, key) => {
            const isChecked = this.props.value === option.value;
            const active = isChecked ? styles.active : "";
            return (
              <label className={`btn ${styles.button} ${active}`} key={key} htmlFor={this.props.name}>
                <FormattedMessage {...{id: option.name}} />
                <input
                  type="radio"
                  name={this.props.target}
                  id={this.props.name}
                  checked={isChecked}
                  value={option.value}
                  onChange={this.props.handleChange}
                />
              </label>
            )
          })}
        </div>
      </div>
    );
  }
}

InputEnum.propTypes = {
  customBootstrapClass: React.PropTypes.string,
  handleChange: React.PropTypes.func.isRequired,
  name: React.PropTypes.string,
  selectOptions: React.PropTypes.array,
  target: React.PropTypes.string,
  value: React.PropTypes.any,
}

export default InputEnum;
