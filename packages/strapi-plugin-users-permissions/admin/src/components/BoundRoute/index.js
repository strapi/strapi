/**
*
* BoundRoute
*
*/

import React from 'react';
import { get, includes, map, tail, toLower } from 'lodash';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import cn from 'classnames';
import styles from './styles.scss';

function BoundRoute({ route }) {
  const title = get(route, 'handler');
  const formattedRoute = get(route, 'path') ? tail(get(route, 'path').split('/')) : [];
  const [ controller = '', action = '' ] = title ? title.split('.') : [];

  return (
    <div className="col-md-12">
      <div className={styles.title}>
        <FormattedMessage id="users-permissions.BoundRoute.title" />
        &nbsp;
        <span>{controller}</span>
        <span>.{action} </span>
      </div>
      <div className={styles.boundRoute}>
        <div className={cn(styles.verb, styles[toLower(get(route, 'method'))])}>
          {get(route, 'method')}
        </div>
        <div className={styles.path}>
          {map(formattedRoute, value => (
            <span
              key={value}
              style={includes(value, ':') ? { color: '#787E8F' } : {}}
            >
              /{value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

BoundRoute.defaultProps = {
  route: {
    handler: 'Nocontroller.error',
    method: 'GET',
    path: '/there-is-no-path',
  },
};

BoundRoute.propTypes = {
  route: PropTypes.object,
};

export default BoundRoute;
