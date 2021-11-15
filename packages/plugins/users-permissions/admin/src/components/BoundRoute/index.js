import React from 'react';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
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
      <Typography variant="delta">
        {formatMessage({
          id: 'users-permissions.BoundRoute.title',
          defaultMessage: 'Bound route to',
        })}
        &nbsp;
        <span>{controller}</span>
        <Typography variant="delta" textColor="primary600">
          .{action}
        </Typography>
      </Typography>
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
          <Typography bold>{method}</Typography>
        </Box>
        <Box style={{ display: 'inline-block' }} paddingLeft={2} paddingRight={2}>
          {map(formattedRoute, value => (
            <Typography key={value} textColor={value.includes(':') ? 'neutral600' : 'neutral900'}>
              /{value}
            </Typography>
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
