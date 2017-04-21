/**
 *
 * PluginHeaderActions
 *
 */

import React from 'react';

import styles from './styles.scss';

class PluginHeaderActions extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const actions = this.props.actions && this.props.actions.map((action, i) => (
      <button
        key={i}
        className={`btn ${action.class} ${styles.btn}`}
        onClick={action.onClick}
        disabled={action.disabled}
      >
        {action.label}
      </button>
    ));

    return (
      <div className={styles.pluginHeaderActions}>
        <div className="pull-xs-right">
          {actions}
        </div>
      </div>
    );
  }
}

PluginHeaderActions.propTypes = {
  actions: React.PropTypes.array,
};

export default PluginHeaderActions;
