import React from 'react';

import { Box, BoxComponent, Flex, Typography } from '@strapi/design-system';
import map from 'lodash/map';
import tail from 'lodash/tail';
import { useIntl } from 'react-intl';
import { styled, DefaultTheme } from 'styled-components';

type HttpVerb = 'POST' | 'GET' | 'PUT' | 'DELETE';

type MethodColor = {
  text: keyof DefaultTheme['colors'];
  border: keyof DefaultTheme['colors'];
  background: keyof DefaultTheme['colors'];
};

const getMethodColor = (verb: HttpVerb): MethodColor => {
  switch (verb) {
    case 'POST': {
      return {
        text: 'success600',
        border: 'success200',
        background: 'success100',
      };
    }
    case 'GET': {
      return {
        text: 'secondary600',
        border: 'secondary200',
        background: 'secondary100',
      };
    }
    case 'PUT': {
      return {
        text: 'warning600',
        border: 'warning200',
        background: 'warning100',
      };
    }
    case 'DELETE': {
      return {
        text: 'danger600',
        border: 'danger200',
        background: 'danger100',
      };
    }
    default: {
      return {
        text: 'neutral600',
        border: 'neutral200',
        background: 'neutral100',
      };
    }
  }
};

const MethodBox = styled<BoxComponent>(Box)`
  margin: -1px;
  border-radius: ${({ theme }) => theme.spaces[1]} 0 0 ${({ theme }) => theme.spaces[1]};
`;

interface BoundRouteProps {
  route: {
    handler: string;
    method: HttpVerb;
    path: string;
  };
}

export const BoundRoute = ({
  route = {
    handler: 'Nocontroller.error',
    method: 'GET',
    path: '/there-is-no-path',
  },
}: BoundRouteProps) => {
  const { formatMessage } = useIntl();

  const { method, handler: title, path } = route;
  const formattedRoute = path ? tail(path.split('/')) : [];
  const [controller = '', action = ''] = title ? title.split('.') : [];
  const colors = getMethodColor(route.method);

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="delta" tag="h3">
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
};
