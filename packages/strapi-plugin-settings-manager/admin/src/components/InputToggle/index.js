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
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

/* eslint-disable react/require-default-props  */
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

  handleToggle = (e) => {
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
    const label = this.props.hiddenLabel ? ''
      : <div className={styles.toggleLabel}><FormattedMessage id={`settings-manager.${this.props.name}`} /></div>;
    const resized = this.props.hiddenLabel ? { marginTop: '-1rem'} : { marginTop: ''};
    return (
      <div className={`${customBootstrapClass} ${styles.container}`} style={resized}>
        {label}
        <div className={`${styles.inputToggle} btn-group`} data-toggle="buttons">
          <button type="button" className={btnClassOff} id="off" onClick={this.handleToggle}>OFF</button>
          <button type="button" className={btnClassOn} id="on" onClick={this.handleToggle}>ON</button>
        </div>
      </div>
    );
  }
}

InputToggle.propTypes = {
  customBootstrapClass: PropTypes.string,
  handleChange: PropTypes.func,
  hiddenLabel: PropTypes.bool,
  isChecked: PropTypes.bool,
  name: PropTypes.string,
  target: PropTypes.string,
};

export default InputToggle;
