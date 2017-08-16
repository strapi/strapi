/**
*
* InputToggle
* Customization
*  - customBootstrapClass : string
*   overrides the default col-md-4 class
*
* Required
*  - handleChange: function
*  - target: string
*  - isChecked: bool
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class InputToggle extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      isChecked: false,
    };
  }

  componentDidMount() {
    const isChecked = this.props.isChecked ? this.props.isChecked : false;
    this.setState({ isChecked });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isChecked !== this.props.isChecked) {
      this.setState({ isChecked: nextProps.isChecked });
    }
  }

  toggle = (e) => {
    e.preventDefault();
    let isChecked = this.state.isChecked;

    // prevent the toggle if the user clicks on the already selected input
    if (e.target.id === 'on' && !this.state.isChecked) {
      isChecked = true;
    } else if (e.target.id === 'off' && this.state.isChecked) {
      isChecked  = false;
    }
    const target = {
      name: this.props.target,
      value: isChecked,
    };
    this.setState({ isChecked });
    this.props.handleChange({ target });
  }

  render() {
    const btnClassOff = this.state.isChecked ? 'btn ' : `btn ${styles.gradientOff}`;
    const btnClassOn = this.state.isChecked ? `btn ${styles.gradientOn}` : 'btn';
    const customBootstrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-4';

    return (
      <div className={`${customBootstrapClass} ${styles.container}`}>
        <div className={styles.toggleLabel}>
          <FormattedMessage {...{id: this.props.name}} />
        </div>
        <div className={`${styles.inputToggle} btn-group`} data-toggle="buttons">
          <button className={btnClassOff} id="off" onClick={this.toggle}>OFF</button>
          <button className={btnClassOn} id="on" onClick={this.toggle}>ON</button>
        </div>
      </div>
    );
  }
}

InputToggle.propTypes = {
  customBootstrapClass: React.PropTypes.string,
  handleChange: React.PropTypes.func.isRequired,
  isChecked: React.PropTypes.bool,
  name: React.PropTypes.string,
  target: React.PropTypes.string.isRequired,
}

export default InputToggle;
