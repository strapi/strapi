import * as React from 'react';

import { Flex, Grid, Typography } from '@strapi/design-system';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import without from 'lodash/without';
import { useIntl } from 'react-intl';

import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
import BoundRoute from '../BoundRoute';

const Policies = () => {
  const { formatMessage } = useIntl();
  const { selectedAction, routes } = useUsersPermissions();

  const path = without(selectedAction.split('.'), 'controllers');
  const controllerRoutes = get(routes, path[0]);
  const pathResolved = path.slice(1).join('.');

  const displayedRoutes = isEmpty(controllerRoutes)
    ? []
    : controllerRoutes.filter((o) => o.handler.endsWith(pathResolved));

  return (
    <Grid.Item
      col={5}
      background="neutral150"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
      style={{ minHeight: '100%' }}
      direction="column"
      alignItems="stretch"
    >
      {selectedAction ? (
        <Flex direction="column" alignItems="stretch" gap={2}>
          {displayedRoutes.map((route, key) => (
            // eslint-disable-next-line react/no-array-index-key
            <BoundRoute key={key} route={route} />
          ))}
        </Flex>
      ) : (
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography variant="delta" tag="h3">
            {formatMessage({
              id: 'users-permissions.Policies.header.title',
              defaultMessage: 'Advanced settings',
            })}
          </Typography>
          <Typography tag="p" textColor="neutral600">
            {formatMessage({
              id: 'users-permissions.Policies.header.hint',
              defaultMessage:
                "Select the application's actions or the plugin's actions and click on the cog icon to display the bound route",
            })}
          </Typography>
        </Flex>
      )}
    </Grid.Item>
  );
};

export default Policies;
