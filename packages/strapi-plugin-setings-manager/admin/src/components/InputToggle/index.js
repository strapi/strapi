/**
*
* InputToggle
*
*/

import React from 'react';
import styles from './styles.scss';

class InputToggle extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {

    }
  }

  render() {
    const btnClassOff = this.props.isChecked ? 'btn ' : `btn ${styles.gradientOff}`;
    const btnClassOn = this.props.isChecked ? `btn ${styles.gradientOn}` : 'btn';
    const customBootstrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-4';
    return (
      <div className={customBootstrapClass}>
        <div className={`${styles.inputToggle} btn-group`} data-toggle="buttons">
          <label className={btnClassOff} htmlFor="off">
            <input
              type="checkbox"
              name={this.props.name}
              id="off"
              onChange={this.props.handleChange}
              checked={this.props.isChecked}
            />
            OFF
          </label>
          <label className="btn" className={btnClassOn} htmlFor="on">
            <input
              type="checkbox"
              name={this.props.name}
              id="on"
              onChange={this.props.handleChange}
              checked={this.props.isChecked}
            />
            ON
          </label>
        </div>
      </div>
    );
  }
}

InputToggle.propTypes = {
  customBootstrapClass: React.PropTypes.string,
  handleChange: React.PropTypes.func.isRequired,
  isChecked: React.PropTypes.bool.isRequired,
  name: React.PropTypes.string.isRequired,
}

export default InputToggle;
