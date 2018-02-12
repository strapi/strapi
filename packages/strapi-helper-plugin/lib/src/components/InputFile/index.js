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

import styles from './styles.scss';

class InputFile extends React.Component {
  state = { isUploading: false };

  handleChange = (e) => {
    const value = Object.keys(e.target.files).reduce((acc, current) => {
      acc.push(e.target.files[current]);

      return acc;
    }, cloneDeep(this.props.value));

    this.setState({ isUploading: !this.state.isUploading });

    const target = {
      name: this.props.name,
      type: 'file',
      value,
    };
    this.props.onChange({ target });
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
        <label
        >
          <ImgPreview
            files={value}
            isUploading={this.state.isUploading}
            multiple={multiple}
            name={name}
            onChange={onChange}
          />
          <input
            className={styles.inputFile}
            multiple={multiple}
            name={name}
            onChange={this.handleChange}
            type="file"
          />

          <div className={styles.buttonContainer}>
            <i className="fa fa-plus" />
            <FormattedMessage id="app.components.InputFile.newFile" />
          </div>
        </label>
      </div>
    );
  }
}

InputFile.defaultProps = {
  multiple: true,
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
