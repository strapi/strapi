/**
 *
 * PluginHeaderActions
 *
 */

import React from 'react';

import styles from './styles.css';

class PluginHeaderActions extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={`${styles.pluginHeaderActions} pull-lg-right`}>
        <button
          type="button"
          className={`${styles.pluginHeaderActionsButton} btn btn-secondary`}
          onClick={this.props.onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`${styles.pluginHeaderActionsButton} btn btn-primary`}
          disabled={this.props.loading}
          onClick={this.props.onFormSubmit}
        >
          Save
        </button>
      </div>
    );
  }
}

PluginHeaderActions.propTypes = {
  loading: React.PropTypes.bool,
  onCancel: React.PropTypes.func,
  onFormSubmit: React.PropTypes.func,
};

export default PluginHeaderActions;
