/**
*
* Controller
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';

import Input from 'components/Input';
import styles from './styles.scss';

function Controller({ actions, name }) {
  return (
    <div className={styles.controller}>
      <div className={styles.controllerHeader}>
        <span>{name}</span>
      </div>
      <div className="row">
        {map(actions, (action, key) => (
          <Input
            key={key}
            label="users-permissions.Controller.input.label"
            labelValues={{ label: key }}
            name="willBeNamed"
            onChange={() => console.log('change')}
            type="checkbox"
            value
            validations={{}}
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
