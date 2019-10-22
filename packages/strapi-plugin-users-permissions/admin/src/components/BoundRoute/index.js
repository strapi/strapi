/**
 *
 * BoundRoute
 *
 */

import React from 'react';
import { get, includes, map, tail, toLower } from 'lodash';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import { Header, Path, Verb, Wrapper } from './Components';

function BoundRoute({ route }) {
  const title = get(route, 'handler');
  const formattedRoute = get(route, 'path')
    ? tail(get(route, 'path').split('/'))
    : [];
  const [controller = '', action = ''] = title ? title.split('.') : [];

  return (
    <div className="col-md-12">
      <Header>
        <FormattedMessage id="users-permissions.BoundRoute.title" />
        &nbsp;
        <span>{controller}</span>
        <span>.{action} </span>
      </Header>
      <Wrapper>
        <Verb className={toLower(get(route, 'method'))}>
          {get(route, 'method')}
        </Verb>
        <Path>
          {map(formattedRoute, value => (
            <span
              key={value}
              style={includes(value, ':') ? { color: '#787E8F' } : {}}
            >
              /{value}
            </span>
          ))}
        </Path>
      </Wrapper>
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
  route: PropTypes.shape({
    handler: PropTypes.string,
    method: PropTypes.string,
    path: PropTypes.string,
  }),
};

export default BoundRoute;
