import React from 'react';
import { useIntl } from 'react-intl';
import { Typography, Flex, GridItem } from '@strapi/design-system';
import BoundRoute from '../BoundRoute';
import { useApiTokenPermissionsContext } from '../../../../../../../contexts/ApiTokenPermissions';

const ActionBoundRoutes = () => {
  const {
    value: { selectedAction, routes },
  } = useApiTokenPermissionsContext();
  const { formatMessage } = useIntl();
  const actionSection = selectedAction?.split('.')[0];

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
        <Flex direction="column" alignItems="stretch" gap={2}>
          {routes[actionSection]?.map((route) => {
            return route.config.auth?.scope?.includes(selectedAction) ||
              route.handler === selectedAction ? (
              <BoundRoute key={route.handler} route={route} />
            ) : null;
          })}
        </Flex>
      ) : (
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography variant="delta" as="h3">
            {formatMessage({
              id: 'Settings.apiTokens.createPage.permissions.header.title',
              defaultMessage: 'Advanced settings',
            })}
          </Typography>
          <Typography as="p" textColor="neutral600">
            {formatMessage({
              id: 'Settings.apiTokens.createPage.permissions.header.hint',
              defaultMessage:
                "Select the application's actions or the plugin's actions and click on the cog icon to display the bound route",
            })}
          </Typography>
        </Flex>
      )}
    </GridItem>
  );
};

export default ActionBoundRoutes;
