/**
 *
 * PluginHeaderActions
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Button from 'components/Button';

import styles from './styles.scss';

class PluginHeaderActions extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const actions = this.props.actions && this.props.actions.map((action) => (
      <Button
        {...action}
        key={action.label}
      />
    ));

    return (
      <div className={styles.pluginHeaderActions}>
          {actions}
      </div>
    );
  }
}

PluginHeaderActions.propTypes = {
  actions: PropTypes.array.isRequired,
};

export default PluginHeaderActions;
