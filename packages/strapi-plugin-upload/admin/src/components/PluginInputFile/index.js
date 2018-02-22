/**
 *
 * PluginInputFile
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import styles from './styles.scss';

/* eslint-disable react/no-string-refs */
/* eslint-disable jsx-a11y/label-has-for */
class PluginInputFile extends React.PureComponent {
  state = { isDraging: false };

  handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.refs.input.click();
  }

  handleDragEnter = () => this.setState({ isDraging: true });

  handleDragLeave = () => this.setState({ isDraging: false });

  handleDrop = (e) => {
    e.preventDefault();
    this.setState({ isDraging: false });
    this.props.onDrop(e);
  }

  render() {
    const {
      name,
      onChange,
    } = this.props;
    const { isDraging } = this.state;
    const link = (
      <FormattedMessage id="upload.PluginInputFile.link">
        {(message) => <u onClick={this.handleClick}>{message}</u>}
      </FormattedMessage>
    );

    return (
      <label
        className={cn(styles.pluginInputFile, isDraging && styles.pluginInputFileHover)}
        onDragEnter={this.handleDragEnter}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={this.handleDrop}
      >
        <p className={styles.textWrapper}>
          <FormattedMessage id="upload.PluginInputFile.text" values={{ link }} />
        </p>
        <div
          onDragLeave={this.handleDragLeave}
          className={cn(isDraging && styles.isDraging)}
        />
        <input
          multiple
          name={name}
          onChange={onChange}
          ref={(input) => {
            this.input = input;
          }}
          type="file"
        />
      </label>
    );
  }
}

PluginInputFile.defaultProps = {
  onChange: () => {},
};

PluginInputFile.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  onDrop: PropTypes.func.isRequired,
};

export default PluginInputFile;
