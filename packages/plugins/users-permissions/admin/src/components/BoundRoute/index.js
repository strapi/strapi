import React from 'react';
import { Stack } from '@strapi/parts/Stack';
import { Box } from '@strapi/parts/Box';
import { H3, Text } from '@strapi/parts/Text';
import map from 'lodash/map';
import tail from 'lodash/tail';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import getMethodColor from './getMethodColor';

function BoundRoute({ route }) {
  const { formatMessage } = useIntl();

  const { method, handler: title, path } = route;
  const formattedRoute = path ? tail(path.split('/')) : [];
  const [controller = '', action = ''] = title ? title.split('.') : [];
  const colors = getMethodColor(route.method);

  return (
    <Stack size={2}>
      <H3>
        {formatMessage({
          id: 'users-permissions.BoundRoute.title',
          defaultMessage: 'Bound route to',
        })}
        &nbsp;
        <span>{controller}</span>
        <Text style={{ fontSize: 'inherit', fontWeight: 'inherit' }} textColor="primary600">
          .{action}
        </Text>
      </H3>
      <Box hasRadius background="neutral0" borderColor="neutral200">
        <Box
          color={colors.text}
          background={colors.background}
          borderColor={colors.border}
          padding={2}
          hasRadius
          style={{
            display: 'inline-block',
            margin: '-1px',
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >
          <Text bold>{method}</Text>
        </Box>
        <Box style={{ display: 'inline-block' }} paddingLeft={2} paddingRight={2}>
          {map(formattedRoute, value => (
            <Text key={value} textColor={value.includes(':') ? 'neutral600' : 'neutral900'}>
              /{value}
            </Text>
          ))}
        </Box>
      </Box>
    </Stack>
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
