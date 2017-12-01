/**
*
* BoundRoute
*
*/

import React from 'react';
import { get, includes, map, tail } from 'lodash';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import styles from './styles.scss';

function BoundRoute({ route }) {
  let color;

  switch (get(route, 'method')) {
    case 'GET':
      color = '#008DFE';
      break;
    case 'POST':
      color = '#69BA05';
      break;
    case 'PUT':
      color = '#F68E0E';
      break;
    default:
      color = '#F64D0A';

  }
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
        <div className={styles.verb} style={{ backgroundColor: color }}>
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
