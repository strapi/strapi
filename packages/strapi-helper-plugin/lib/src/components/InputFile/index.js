/**
 *
 *
 * InputFile
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { cloneDeep, isArray, isObject, isEmpty, last } from 'lodash';
import cn from 'classnames';

import ImgPreview from 'components/ImgPreview';
import InputFileDetails from 'components/InputFileDetails';

import styles from './styles.scss';

class InputFile extends React.Component {
  state = {
    didDeleteFile: false,
    isOpen: false,
    isUploading: false,
    position: 0,
  };

  addFilesToProps = (files) => {
    const initAcc = this.props.multiple ? cloneDeep(this.props.value) : [];
    const value = Object.keys(files).reduce((acc, current) => {

      if (this.props.multiple) {
        acc.push(files[current]);
      } else if (current === '0') {

        acc.push(files[0]);
      }

      return acc;
    }, initAcc)

    const target = {
      name: this.props.name,
      type: 'file',
      value,
    };

    this.setState({ isUploading: !this.state.isUploading });
    this.props.onChange({ target });
  }

  handleChange = ({ target }) => this.addFilesToProps(target.files);

  handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.refs.inputFile.click();
  }

  onDrop = (e) => {
    e.preventDefault();
    this.addFilesToProps(e.dataTransfer.files);
  }

  handleFileDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Remove the file from props
    const value = cloneDeep(this.props.value);
    value.splice(this.state.position, 1);
    // Update the parent's props
    const target = {
      name: this.props.name,
      type: 'file',
      value,
    };

    this.props.onChange({ target });

    // Update the position of the children
    const newPosition = value.length === 0 ? 0 : value.length - 1;

    this.updateFilePosition(newPosition);
    this.setState({ didDeleteFile: !this.state.didDeleteFile });
  }

  updateFilePosition = (newPosition) => this.setState({ position: newPosition });

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
            ref="inputFile"
          />

          <div className={styles.buttonContainer}>
            <i className="fa fa-plus" />
            <FormattedMessage id="app.components.InputFile.newFile" />
          </div>
        </label>
        <InputFileDetails
          file={value[this.state.position]}
          isOpen={this.state.isOpen}
          number={value.length}
          onClick={() => { this.setState({ isOpen: !this.state.isOpen }) }}
          position={this.state.position}
          onFileDelete={this.handleFileDelete}
        />
      </div>
    );
  }
}

InputFile.defaultProps = {
  multiple: false,
  value: [],
};

InputFile.propTypes = {
  multiple: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default InputFile;
