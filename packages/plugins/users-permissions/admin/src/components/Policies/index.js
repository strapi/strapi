import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Box, Select, Option, GridItem, H3, Text, Stack } from '@strapi/parts';
import { get, isEmpty, takeRight, toLower, without } from 'lodash';
import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
import BoundRoute from '../BoundRoute';

const Policies = () => {
  const { formatMessage } = useIntl();
  const { modifiedData, selectedAction, routes, policies, onChange } = useUsersPermissions();
  const path = without(selectedAction.split('.'), 'controllers');
  const controllerRoutes = get(routes, path[0]);
  const displayedRoutes = isEmpty(controllerRoutes)
    ? []
    : controllerRoutes.filter(o => toLower(o.handler) === toLower(takeRight(path, 2).join('.')));

  const inputName = `${selectedAction}.policy`;

  const value = useMemo(() => {
    return get(modifiedData, inputName, '');
  }, [inputName, modifiedData]);

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
      <H3>
        {formatMessage({
          id: 'users-permissions.Policies.header.title',
          defaultMessage: 'Advanced settings',
        })}
      </H3>
      {selectedAction ? (
        <Stack size={6} paddingTop={6}>
          <Select
            value={value}
            name={inputName}
            onChange={newValue => onChange({ target: { name: inputName, value: newValue } })}
            label={formatMessage({
              id: 'Policies.InputSelect.label',
              defaultMessage: 'Allow to perform this action for:',
            })}
          >
            {policies.map(policy => (
              <Option value={policy.value} key={policy.value}>
                {policy.label}
              </Option>
            ))}
          </Select>
          {displayedRoutes.map((route, key) => (
            // eslint-disable-next-line react/no-array-index-key
            <BoundRoute key={key} route={route} />
          ))}
        </Stack>
      ) : (
        <Box paddingTop={2}>
          <Text as="p" textColor="neutral600">
            {formatMessage({
              id: 'users-permissions.Policies.header.hint',
              defaultMessage:
                "Select the application's actions or the plugin's actions and click on the cog icon to display the bound route",
            })}
          </Text>
        </Box>
      )}
    </GridItem>
  );
};

export default Policies;
