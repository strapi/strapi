/**
*
* Controller
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { get, map } from 'lodash';

import InputCheckbox from 'components/InputCheckbox';
import styles from './styles.scss';

function Controller({ actions, name }) {
  return (
    <div className={styles.controller}>
      <div className={styles.controllerHeader}>
        <span>{name}</span>
      </div>
      <div className="row">
        {map(actions, (action, key) => (
          <InputCheckbox
            key={key}
            value={get(action, 'enabled')}
          />
        ))}
      </div>
    </div>
  );
}

Controller.defaultProps = {
  actions: {},
  name: '',
};

Controller.propTypes = {
  actions: PropTypes.object,
  name: PropTypes.string,
};

export default Controller;
