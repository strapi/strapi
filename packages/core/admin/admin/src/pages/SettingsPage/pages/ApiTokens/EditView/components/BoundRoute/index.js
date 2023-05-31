import React from 'react';
import styled from 'styled-components';
import { Flex, Box, Typography } from '@strapi/design-system';
import map from 'lodash/map';
import tail from 'lodash/tail';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import getMethodColor from './getMethodColor';

const MethodBox = styled(Box)`
  margin: -1px;
  border-radius: ${({ theme }) => theme.spaces[1]} 0 0 ${({ theme }) => theme.spaces[1]};
`;

function BoundRoute({ route }) {
  const { formatMessage } = useIntl();

  const { method, handler: title, path } = route;
  const formattedRoute = path ? tail(path.split('/')) : [];
  const [controller = '', action = ''] = title ? title.split('.') : [];
  const colors = getMethodColor(route.method);

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="delta" as="h3">
        {formatMessage({
          id: 'Settings.apiTokens.createPage.BoundRoute.title',
          defaultMessage: 'Bound route to',
        })}
        &nbsp;
        <span>{controller}</span>
        <Typography variant="delta" textColor="primary600">
          .{action}
        </Typography>
      </Typography>
      <Flex hasRadius background="neutral0" borderColor="neutral200" gap={0}>
        <MethodBox background={colors.background} borderColor={colors.border} padding={2}>
          <Typography fontWeight="bold" textColor={colors.text}>
            {method}
          </Typography>
        </MethodBox>
        <Box paddingLeft={2} paddingRight={2}>
          {map(formattedRoute, (value) => (
            <Typography key={value} textColor={value.includes(':') ? 'neutral600' : 'neutral900'}>
              /{value}
            </Typography>
          ))}
        </Box>
      </Flex>
    </Flex>
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
