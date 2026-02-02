import React, { useReducer } from 'react';

import { Accordion, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
import formatPluginName from '../../utils/formatPluginName';

import init from './init';
import PermissionRow from './PermissionRow';
import { initialState, reducer } from './reducer';

const Permissions = () => {
  const { modifiedData } = useUsersPermissions();
  const { formatMessage } = useIntl();
  const [{ collapses }] = useReducer(reducer, initialState, (state) => init(state, modifiedData));

  return (
    <Accordion.Root size="M">
      <Flex direction="column" alignItems="stretch" gap={1}>
        {collapses.map((collapse, index) => (
          <Accordion.Item key={collapse.name} value={collapse.name}>
            <Accordion.Header variant={index % 2 === 0 ? 'secondary' : undefined}>
              <Accordion.Trigger
                caretPosition="right"
                description={formatMessage(
                  {
                    id: 'users-permissions.Plugin.permissions.plugins.description',
                    defaultMessage: 'Define all allowed actions for the {name} plugin.',
                  },
                  { name: collapse.name }
                )}
              >
                {formatPluginName(collapse.name)}
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <PermissionRow permissions={modifiedData[collapse.name]} name={collapse.name} />
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Flex>
    </Accordion.Root>
  );
};

export default Permissions;
