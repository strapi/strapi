/**
*
* InputToggle
*
*/

import React from 'react';

import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.scss';

class InputToggle extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {

    }
  }
  onChange = ({ target }) => {
    console.log(target)
  }
  render() {
    const btnClassOff = this.props.value ? 'btn btn-secondary' : 'btn btn-warning';
    const btnClassOn = this.props.value ? 'btn btn-primary' : 'btn btn-secondary';
    console.log(this.props.value);

    return (
      <div className={`${styles.inputRadio} btn-group`} data-toggle="buttons">
        <label className="btn" className={btnClassOff}>
          <input
            type="checkbox"
            name="options"
            id="off"
            autocomplete="off"
            onChange={this.props.handleChange}
            value={false}
            checked={this.props.value}
          />
          OFF
        </label>
        <label className="btn" className={btnClassOn}>
          <input
            type="checkbox"
            name="options"
            id="on"
            autocomplete="off"
            onChange={this.props.handleChange}
            value={true}
            checked={this.props.value}
          />
          ON
        </label>
      </div>
    );
  }
}

export default InputToggle;


// F76B00
