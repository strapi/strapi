/**
*
* PluginCard
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import styles from './styles.scss';

function PluginCard({ isAlreadyInstalled, plugin, showSupportUsButton }) {
  return (
    <div className={cn('col-md-4', styles.pluginCard)}>
      <div className={styles.wrapper}>
        <div className={styles.cardTitle}>
          {plugin.name}
        </div>
        <div className={styles.cardDescription}></div>
        <div className={styles.cardScreenshot}></div>
        <div className={styles.cardPrice}></div>
        <div className={styles.cardFooter}>{isAlreadyInstalled} {showSupportUsButton}</div>
      </div>
    </div>
  );
}

PluginCard.defaultProps = {
  isAlreadyInstalled: false,
  plugin: {
    description: '',
    id: '',
    icon: '',
    name: '',
    price: 0,
    ratings: 5,
  },
  showSupportUsButton: false,
};

PluginCard.propTypes = {
  isAlreadyInstalled: PropTypes.bool,
  plugin: PropTypes.object,
  showSupportUsButton: PropTypes.bool,
};

export default PluginCard;
