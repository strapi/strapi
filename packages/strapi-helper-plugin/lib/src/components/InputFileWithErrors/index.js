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
import Label from 'components/Label';
import InputDescription from 'components/InputDescription';
import InputFile from 'components/InputFile';
import InputSpacer from 'components/InputSpacer';

import styles from './styles.scss';

class InputFileWithErrors extends React.Component {
  state = { label: false, hasValue: false };

  componentDidMount() {
    if (this.props.multiple && !isEmpty(this.props.value)) {
      this.setState({ label: 1, hasValue: true });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!this.state.hasValue && !isEmpty(nextProps.value) && nextProps.multiple && differenceBy(nextProps.value, this.props.value, 'name').length > 0) {
      this.setState({ label: 1, hasValue: true });
    }
  }

  setLabel = (label) => {
    this.setState({ label });
  }
  // TODO handle errors lifecycle
  render() {
    const {
      className,
      customBootstrapClass,
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
        {spacer}
      </div>
    );
  }
}

InputFileWithErrors.defaultProps = {
  className: '',
  customBootstrapClass: 'col-md-6',
  inputDescription: '',
  inputDescriptionClassName: '',
  inputDescriptionStyle: {},
  label: '',
  labelClassName: '',
  labelStyle: {},
  multiple: false,
  style: {},
  value: [],
};

InputFileWithErrors.propTypes = {
  className: PropTypes.string,
  customBootstrapClass: PropTypes.string,
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
  onChange: PropTypes.func.isRequired,
  style: PropTypes.object,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default InputFileWithErrors;
