/**
 *
 * InputCheckboxPlugin
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import { Label, Wrapper } from './Components';

class InputCheckboxPlugin extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { showBackground: false, showCog: false };

  UNSAFE_componentWillReceiveProps(nextProps) {
    // Remove background if another input is selected
    if (
      nextProps.inputSelected !== this.props.inputSelected &&
      nextProps.inputSelected !== this.props.name
    ) {
      this.setState({ showBackground: false });
    }

    if (!nextProps.isOpen) {
      this.setState({ showBackground: false, showCog: false });
    }
  }

  handleChange = () => {
    const target = {
      type: 'checkbox',
      name: this.props.name,
      value: !this.props.value,
    };

    // Don't show the label background if the user unselects the input
    if (!this.props.value) {
      this.setState({ showBackground: true });
      // Tell the Parent component that another input has been selected
      this.props.setNewInputSelected(this.props.name);
      // Tell the policies component to show the associated routes
      this.context.setShouldDisplayPolicieshint();
      this.context.setInputPoliciesPath(this.props.name);
    } else {
      this.setState({ showBackground: false, showCog: false });
      this.props.setNewInputSelected('');
    }

    this.context.onChange({ target });
  };

  handleClick = () => {
    this.setState({ showBackground: !this.state.showBackground });
    this.props.setNewInputSelected(this.props.name);
    this.context.setInputPoliciesPath(this.props.name);

    if (this.state.showBackground) {
      this.context.resetShouldDisplayPoliciesHint();
    } else {
      this.context.setShouldDisplayPolicieshint();
    }
  };

  render() {
    return (
      <Wrapper
        className="col-md-4"
        onMouseEnter={() => {
          if (this.props.value) {
            this.setState({ showCog: true });
          }
        }}
        onMouseLeave={() => this.setState({ showCog: false })}
      >
        <div
          className={`form-check ${
            this.state.showBackground ? 'highlighted' : ''
          }`}
        >
          <Label
            className={`form-check-label ${this.props.value ? 'checked' : ''}`}
            htmlFor={this.props.name}
          >
            <input
              className="form-check-input"
              defaultChecked={this.props.value}
              id={this.props.name}
              name={this.props.name}
              onChange={this.handleChange}
              type="checkbox"
            />
            {this.props.label}
          </Label>
          {this.state.showCog || this.state.showBackground ? (
            <i className="fa fa-cog" onClick={this.handleClick} />
          ) : (
            ''
          )}
        </div>
      </Wrapper>
    );
  }
}

InputCheckboxPlugin.contextTypes = {
  onChange: PropTypes.func.isRequired,
  resetShouldDisplayPoliciesHint: PropTypes.func.isRequired,
  setInputPoliciesPath: PropTypes.func.isRequired,
  setShouldDisplayPolicieshint: PropTypes.func.isRequired,
};

InputCheckboxPlugin.defaultProps = {
  label: '',
  value: false,
};

InputCheckboxPlugin.propTypes = {
  inputSelected: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  setNewInputSelected: PropTypes.func.isRequired,
  value: PropTypes.bool,
};

export default InputCheckboxPlugin;
