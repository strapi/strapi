/**
*
* InputCheckbox
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

class InputCheckbox extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { showBackground: false };

  handleChange = () => {
    const target = {
      type: 'checkbox',
      name: this.props.name,
      value: !this.props.value,
    };

    this.context.onChange({ target });
    this.setState({ showBackground: true });
  }

  render() {
    return (
      <div className={cn(styles.inputCheckbox, 'col-md-4')}>
        <div className={cn('form-check', this.state.showBackground ? styles.highlighted : '')}>
          <label className={cn('form-check-label', styles.label, this.props.value ? styles.checked : '')} htmlFor={this.props.name}>
            <input
              className="form-check-input"
              defaultChecked={this.props.value}
              id={this.props.name}
              name={this.props.name}
              onChange={this.handleChange}
              type="checkbox"
            />
            {this.props.label}
          </label>
        </div>
      </div>
    );
  }
}

InputCheckbox.contextTypes = {
  onChange: PropTypes.func.isRequired,
};

InputCheckbox.defaultProps = {
  label: '',
  value: false,
};

InputCheckbox.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.bool,
};

export default InputCheckbox;
