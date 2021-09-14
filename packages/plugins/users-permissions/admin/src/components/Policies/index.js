import React from 'react';
import { useIntl } from 'react-intl';
import { GridItem, H3, Text, Stack } from '@strapi/parts';

const Policies = () => {
  const { formatMessage } = useIntl();

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
            description:
              "Select the application's actions or the plugin's actions and click on the cog icon to display the bound route",
          })}
        </Text>
      </Stack>
    </GridItem>
  );
};

export default Policies;
