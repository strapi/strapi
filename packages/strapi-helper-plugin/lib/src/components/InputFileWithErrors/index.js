/**
 *
 * InputFileWithErrors
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { differenceBy, isEmpty } from 'lodash';

// Design
import Label from '../Label';
import InputDescription from '../InputDescription';
import InputFile from '../InputFile';
import InputSpacer from '../InputSpacer';
import InputErrors from '../InputErrors';

// Styles
import styles from './styles.scss';

class InputFileWithErrors extends React.PureComponent {
  state = {  errors: [], label: null, hasValue: false };
  
  componentDidMount() {
    const { errors } = this.props;
    let newState = Object.assign({}, this.state);

    if (this.props.multiple && !isEmpty(this.props.value)) {
      newState = Object.assign({}, newState, { label: 1, hasValue: true });
    }

    if (!isEmpty(errors)) {
      newState = Object.assign({}, newState, { errors });
    }

    this.setState(newState);
  }

  componentDidUpdate(prevProps) {
    if (!this.state.hasValue && !isEmpty(this.props.value) && this.props.multiple && differenceBy(this.props.value, prevProps.value, 'name').length > 0) {
      this.updateState({ label: 1, hasValue: true });
    } else if(isEmpty(this.props.value)) {
      this.updateState({ label: null });
    }
    // Check if errors have been updated during validations
    if (prevProps.didCheckErrors !== this.props.didCheckErrors) {
      // Remove from the state the errors that have already been set
      const errors = isEmpty(this.props.errors) ? [] : this.props.errors;
      this.updateState({ errors });
    }
  }

  setLabel = (label) => {
    this.setState({ label });
  }

  updateState = state => {
    this.setState(state);
  }

  // TODO handle errors lifecycle
  render() {
    const {
      className,
      customBootstrapClass,
      errorsClassName,
      errorsStyle,
      noErrorsDescription,
      inputDescription,
      inputDescriptionClassName,
      inputDescriptionStyle,
      label,
      labelClassName,
      labelStyle,
      multiple,
      name,
      onChange,
      style,
      value,
    } = this.props;

    const labelClass = labelClassName === '' ? styles.labelFile : labelClassName;
    const spacer = isEmpty(inputDescription) ? <InputSpacer /> : <div />;

    return (
      <div
        className={cn(
          styles.inputFileWithErrorsContainer,
          customBootstrapClass,
          className !== '' && className,
        )}
        style={style}
      >
        <Label
          className={labelClass}
          htmlFor={`${name}NotNeeded`}
          message={label}
          style={labelStyle}
        />
        { this.state.label && (
          <span className={styles.labelNumber}>&nbsp;({this.state.label}/{value.length})</span>
        )}
        <InputFile
          multiple={multiple}
          error={!isEmpty(this.state.errors)}
          name={name}
          onChange={onChange}
          setLabel={this.setLabel}
          value={value}
        />
        <InputDescription
          className={inputDescriptionClassName}
          message={inputDescription}
          style={inputDescriptionStyle}
        />
        <InputErrors
          className={errorsClassName}
          errors={!noErrorsDescription && this.state.errors || []}
          name={name}
          style={errorsStyle}
        />
        {spacer}
      </div>
    );
  }
}

InputFileWithErrors.defaultProps = {
  errors: [],
  errorsClassName: '',
  errorsStyle: {},
  className: '',
  customBootstrapClass: 'col-md-6',
  didCheckErrors: false,
  inputDescription: '',
  inputDescriptionClassName: '',
  inputDescriptionStyle: {},
  label: '',
  labelClassName: '',
  labelStyle: {},
  multiple: false,
  noErrorsDescription: false,
  style: {},
  value: [],
};

InputFileWithErrors.propTypes = {
  className: PropTypes.string,
  customBootstrapClass: PropTypes.string,
  didCheckErrors: PropTypes.bool,
  errors: PropTypes.array,
  errorsClassName: PropTypes.string,
  errorsStyle: PropTypes.object,
  inputDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  inputDescriptionClassName: PropTypes.string,
  inputDescriptionStyle: PropTypes.object,
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  labelClassName: PropTypes.string,
  labelStyle: PropTypes.object,
  multiple: PropTypes.bool,
  name: PropTypes.string.isRequired,
  noErrorsDescription: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  style: PropTypes.object,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default InputFileWithErrors;
