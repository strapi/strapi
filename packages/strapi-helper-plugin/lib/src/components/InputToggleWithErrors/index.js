/**
 *
 * InputToggleWithErrors
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { isEmpty } from 'lodash';
// Design
import Label from 'components/Label';
import InputDescription from 'components/InputDescription';
import InputErrors from 'components/InputErrors';
import InputToggle from 'components/InputToggle';

import styles from './styles.scss';

class InputToggleWithErrors extends React.Component {
  state = { errors: [] }
  componentDidMount() {
    const { errors } = this.props;

    // Display input error if it already has some
    if (!isEmpty(errors)) {
      this.setState({ errors })
    }
  }

  componentWillReceiveProps(nextProps) {
    // Check if errors have been updated during validations
    if (nextProps.didCheckErrors !== this.props.didCheckErrors) {
      // Remove from the state the errors that have already been set
      const errors = isEmpty(nextProps.errors) ? [] : nextProps.errors;
      this.setState({ errors });
    }
  }

  render() {
    const {
      autoFocus,
      className,
      customBootstrapClass,
      deactivateErrorHighlight,
      disabled,
      errorsClassName,
      errorsStyle,
      inputClassName,
      inputDescription,
      inputDescriptionClassName,
      inputDescriptionStyle,
      inputStyle,
      label,
      labelClassName,
      labelStyle,
      name,
      onChange,
      style,
      tabIndex,
      value,
    } = this.props;

    return (
      <div className={cn(
          styles.container,
          customBootstrapClass,
          !isEmpty(className) && className,
        )}
        style={style}
      >
        <div className={styles.toggleLabel}>
          <Label
            className={cn(!isEmpty(labelClassName) && labelClassName)}
            htmlFor={name}
            message={label && label.message || label}
            style={labelStyle}
            />
        </div>
        <InputToggle
          autoFocus={autoFocus}
          className={inputClassName}
          deactivateErrorHighlight={deactivateErrorHighlight}
          disabled={disabled}
          error={!isEmpty(this.state.errors)}
          name={name}
          onChange={onChange}
          style={inputStyle}
          tabIndex={tabIndex}
          value={value}
        />
        <InputDescription
          className={inputDescriptionClassName}
          message={inputDescription && inputDescription.message || inputDescription}
          style={inputDescriptionStyle}
        />
        <InputErrors
          className={errorsClassName}
          errors={this.state.errors}
          style={errorsStyle}
        />
      </div>
    );
  }
}

InputToggleWithErrors.defaultProps = {
  autoFocus: false,
  className: '',
  customBootstrapClass: 'col-md-6',
  deactivateErrorHighlight: false,
  didCheckErrors: false,
  disabled: false,
  errors: [],
  errorsClassName: '',
  errorsStyle: {},
  inputClassName: '',
  inputDescription: '',
  inputDescriptionClassName: '',
  inputDescriptionStyle: {},
  inputStyle: {},
  label: '',
  labelClassName: '',
  labelStyle: {},
  style: {},
  tabIndex: '0',
  value: true,
};

InputToggleWithErrors.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  customBootstrapClass: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  didCheckErrors: PropTypes.bool,
  disabled: PropTypes.bool,
  errors: PropTypes.array,
  errorsClassName: PropTypes.string,
  errorsStyle: PropTypes.object,
  inputClassName: PropTypes.string,
  inputDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      message: PropTypes.shape({
        id: PropTypes.string,
        params: PropTypes.object,
      }),
    }),
  ]),
  inputDescriptionClassName: PropTypes.string,
  inputDescriptionStyle: PropTypes.object,
  inputStyle: PropTypes.object,
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      message: PropTypes.shape({
        id: PropTypes.string,
        params: PropTypes.object,
      }),
    }),
  ]),
  labelClassName: PropTypes.string,
  labelStyle: PropTypes.object,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.bool,
};

export default InputToggleWithErrors;
