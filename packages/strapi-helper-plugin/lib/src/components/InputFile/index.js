/**
 *
 *
 * InputFile
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { cloneDeep } from 'lodash';

import ImgPreview from 'components/ImgPreview';
import InputFileDetails from 'components/InputFileDetails';

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
      value,
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

  render() {
    const {
      multiple,
      name,
      onChange,
      value,
    } = this.props;

    return (
      <div>
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
        <label style={{ width: '100%'}}>
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
        <InputFileDetails
          file={value[this.state.position] || value[0] || value}
          multiple={multiple}
          number={value.length}
          onFileDelete={this.handleFileDelete}
        />
      </div>
    );
  }
}

InputFile.defaultProps = {
  multiple: false,
  setLabel: () => {},
  value: [],
};

InputFile.propTypes = {
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
