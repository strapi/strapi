import React from 'react';
import { useIntl } from 'react-intl';
import { H3, Text } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import { GridItem } from '@strapi/parts/Grid';
import { get, isEmpty, takeRight, toLower, without } from 'lodash';
import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
import BoundRoute from '../BoundRoute';

const Policies = () => {
  const { formatMessage } = useIntl();
  const { selectedAction, routes } = useUsersPermissions();
  const path = without(selectedAction.split('.'), 'controllers');
  const controllerRoutes = get(routes, path[0]);
  const displayedRoutes = isEmpty(controllerRoutes)
    ? []
    : controllerRoutes.filter(o => toLower(o.handler) === toLower(takeRight(path, 2).join('.')));

  return (
    <GridItem
      col={5}
      background="neutral150"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
      style={{ minHeight: '100%' }}
    >
      {selectedAction ? (
        <Stack size={2}>
          {displayedRoutes.map((route, key) => (
            // eslint-disable-next-line react/no-array-index-key
            <BoundRoute key={key} route={route} />
          ))}
        </Stack>
      ) : (
        <Stack size={2}>
          <H3>
            {formatMessage({
              id: 'users-permissions.Policies.header.title',
              defaultMessage: 'Advanced settings',
            })}
          </H3>
          <Text as="p" textColor="neutral600">
            {formatMessage({
              id: 'users-permissions.Policies.header.hint',
              defaultMessage:
                "Select the application's actions or the plugin's actions and click on the cog icon to display the bound route",
            })}
          </Text>
        </Stack>
      )}
    </GridItem>
  );
};

export default Policies;
