/**
 *
 *
 * InputFile
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { cloneDeep, isArray, isObject } from 'lodash';
import cn from 'classnames';

import ImgPreview from '../ImgPreview';
import InputFileDetails from '../InputFileDetails';

import styles from './styles.scss';

/* eslint-disable react/jsx-handler-names */
/* eslint-disable jsx-a11y/label-has-for */
class InputFile extends React.Component {
  state = {
    didDeleteFile: false,
    isUploading: false,
    position: 0,
  };

  onDrop = (e) => {
    e.preventDefault();
    this.addFilesToProps(e.dataTransfer.files);
  }

  handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.inputFile.click();
  }

  handleChange = ({ target }) => this.addFilesToProps(target.files);

  addFilesToProps = (files) => {
    if (files.length === 0) {
      return;
    }

    const initAcc = this.props.multiple ? cloneDeep(this.props.value) : {};
    const value = Object.keys(files).reduce((acc, current) => {

      if (this.props.multiple) {
        acc.push(files[current]);
      } else if (current === '0') {
        acc[0] = files[0];
      }

      return acc;
    }, initAcc);

    const target = {
      name: this.props.name,
      type: 'file',
      value,
    };
    
    this.inputFile.value = '';
    this.setState({ isUploading: !this.state.isUploading });
    this.props.onChange({ target });
  }

  handleFileDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Remove the file from props
    const value = this.props.multiple ? cloneDeep(this.props.value) : {};

    // Remove the file from the array if multiple files upload is enable
    if (this.props.multiple) {
      value.splice(this.state.position, 1);
    }

    // Update the parent's props
    const target = {
      name: this.props.name,
      type: 'file',
      value: Object.keys(value).length === 0 ? '' : value,
    };

    this.props.onChange({ target });

    // Update the position of the children
    if (this.props.multiple) {
      const newPosition = value.length === 0 ? 0 : value.length - 1;
      this.updateFilePosition(newPosition, value.length);
    }
    this.setState({ didDeleteFile: !this.state.didDeleteFile });
  }

  updateFilePosition = (newPosition, size = this.props.value.length) => {
    const label = size === 0 ? false : newPosition + 1;
    this.props.setLabel(label);
    this.setState({ position: newPosition });
  }

  isVisibleDetails = () => {
    const {value} = this.props;

    if (!value ||
      (isArray(value) && value.length === 0) || 
      (isObject(value) && Object.keys(value).length === 0)
    ) {
      return false;
    }

    return true;
  }

  render() {
    const {
      multiple,
      name,
      onChange,
      value,
    } = this.props;

    return (
      <div>
        <div className={cn("form-control", styles.inputFileControlForm, this.props.error && 'is-invalid')}>
          <ImgPreview
            didDeleteFile={this.state.didDeleteFile}
            files={value}
            isUploading={this.state.isUploading}
            multiple={multiple}
            name={name}
            onChange={onChange}
            onBrowseClick={this.handleClick}
            onDrop={this.onDrop}
            position={this.state.position}
            updateFilePosition={this.updateFilePosition}
          />
          <label style={{ marginBottom: 0, width: '100%' }}>
            <input
              className={styles.inputFile}
              multiple={multiple}
              name={name}
              onChange={this.handleChange}
              type="file"
              ref={(input) => this.inputFile = input}
            />

            <div className={styles.buttonContainer}>
              <i className="fa fa-plus" />
              <FormattedMessage id="app.components.InputFile.newFile" />
            </div>
          </label>
        </div>
        {this.isVisibleDetails() && (
          <InputFileDetails
            file={value[this.state.position] || value[0] || value}
            multiple={multiple}
            number={value.length}
            onFileDelete={this.handleFileDelete}
          />
        )}
      </div>
    );
  }
}

InputFile.defaultProps = {
  multiple: false,
  setLabel: () => {},
  value: [],
  error: false,

};

InputFile.propTypes = {
  error: PropTypes.bool,
  multiple: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  setLabel: PropTypes.func,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default InputFile;
