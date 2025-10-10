import { Grid, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useApiTokenPermissions } from '../apiTokenPermissions';

import { BoundRoute } from './BoundRoute';

export const ActionBoundRoutes = () => {
  const {
    value: { selectedAction, routes },
  } = useApiTokenPermissions();
  const { formatMessage } = useIntl();
  const actionSection = selectedAction?.split('.')[0];

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
          {actionSection &&
            actionSection in routes &&
            routes[actionSection].map((route) => {
              return route.config.auth?.scope?.includes(selectedAction) ||
                route.handler === selectedAction ? (
                <BoundRoute key={route.handler} route={route} />
              ) : null;
            })}
        </Flex>
      ) : (
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography variant="delta" tag="h3">
            {formatMessage({
              id: 'Settings.apiTokens.createPage.permissions.header.title',
              defaultMessage: 'Advanced settings',
            })}
          </Typography>
          <Typography tag="p" textColor="neutral600">
            {formatMessage({
              id: 'Settings.apiTokens.createPage.permissions.header.hint',
              defaultMessage:
                "Select the application's actions or the plugin's actions and click on the cog icon to display the bound route",
            })}
          </Typography>
        </Flex>
      )}
    </Grid.Item>
  );
};
