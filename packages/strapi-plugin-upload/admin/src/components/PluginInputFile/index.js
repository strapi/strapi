/**
 *
 * PluginInputFile
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

class PluginInputFile extends React.PureComponent {
  state = { isDraging: false };

  handleDragEnter = () => this.setState({ isDraging: true });

  handleDragLeave = () => this.setState({ isDraging: false });

  handleDrop = (e) => {
    e.preventDefault();
    this.setState({ isDraging: false });
  }

  render() {
    const {
      name,
      onChange,
    } = this.props;
    const { isDraging } = this.state;

    return (
      <label
        className={cn(styles.pluginInputFile)}
        onDragEnter={this.handleDragEnter}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={this.handleDrop}
      >
        <div
          onDragLeave={this.handleDragLeave}
          className={cn(isDraging && styles.isDraging)}
        />
        <input
          name={name}
          onChange={onChange}
          type="file"
        />
      </label>
    );
  }
}

PluginInputFile.defaultProps = {
  onChange: () => {},
  value: [],
};

PluginInputFile.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.array,
};

export default PluginInputFile;
