/**
 *
 * PluginHeaderActions
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isArray, isFunction } from 'lodash';

import Button from '../Button';

import styles from './styles.scss';

function PluginHeaderActions({ actions, overrideRendering }) {
  let content = '';

  if (isArray(actions)) {
    content = actions.map(action => (
      <Button {...action} key={action.label} />
    ));
  }

  if (isFunction(overrideRendering)) {
    content = overrideRendering();
  }

  return (
    <div className={styles.pluginHeaderActions}>
      {content}
    </div>
  );
}

PluginHeaderActions.defaultProps = {
  actions: false,
  overrideRendering: false,
};

PluginHeaderActions.propTypes = {
  actions: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.bool,
  ]),
  overrideRendering: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
};

export default PluginHeaderActions;
