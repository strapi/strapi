/**
 * 
 * SettingsRow
 */

import React from 'react';
import { upperFirst } from 'lodash';
import PropTypes from 'prop-types';
import IcoContainer from 'components/IcoContainer';

import styles from './styles.scss';


function SettingsRow({name }) {
  return (
    <div className={styles.settingsRow}>
      <div>
        <div className={styles.frame}>
          <div className={styles.icon}>
            <i className="fa fa-cube"></i>
          </div>
          {upperFirst(name)}
        </div>
        <IcoContainer icons={[{icoType: 'cog'}]} />
      </div>
    </div>
  );
}

SettingsRow.propTypes = {
  name: PropTypes.string.isRequired,
};

export default SettingsRow;
