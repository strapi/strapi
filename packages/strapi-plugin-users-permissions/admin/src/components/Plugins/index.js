/**
*
* Plugins
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { map } from 'lodash';
import PropTypes from 'prop-types';
import cn from 'classnames';
import Plugin from 'components/Plugin';

import styles from './styles.scss';

function Plugins({ plugins }) {
  return (
    <div className={cn('col-md-7', styles.wrapper)}>
      <div className={styles.plugins}>
        <div className={styles.headerContainer}>
          <div>
            <FormattedMessage id="users-permissions.Plugins.header.title" />
          </div>
          <div>
            <FormattedMessage id="users-permissions.Plugins.header.description" />
          </div>
        </div>
        <div className={styles.pluginsContainer}>
          {map(plugins, (plugin, key) => <Plugin key={key} name={key} plugin={plugin} />)}
        </div>
      </div>
    </div>
  );
}

Plugins.defaultProps = {
  plugins: {},
};

Plugins.propTypes = {
  plugins: PropTypes.object,
};

export default Plugins;
