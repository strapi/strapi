import React, { useReducer } from 'react';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/design-system/Accordion';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
import formatPluginName from '../../utils/formatPluginName';
import PermissionRow from './PermissionRow';
import init from './init';
import { initialState, reducer } from './reducer';

const Permissions = () => {
  const { modifiedData } = useUsersPermissions();
  const { formatMessage } = useIntl();
  const [{ collapses }, dispatch] = useReducer(reducer, initialState, state =>
    init(state, modifiedData)
  );

  const handleToggle = index =>
    dispatch({
      type: 'TOGGLE_COLLAPSE',
      index,
    });

  return (
    <Stack spacing={1}>
      {collapses.map((collapse, index) => (
        <Accordion
          expanded={collapse.isOpen}
          onToggle={() => handleToggle(index)}
          key={collapse.name}
          variant={index % 2 === 0 ? 'secondary' : undefined}
        >
          <AccordionToggle
            title={formatPluginName(collapse.name)}
            description={formatMessage(
              {
                id: 'users-permissions.Plugin.permissions.plugins.description',
                defaultMessage: 'Define all allowed actions for the {name} plugin.',
              },
              { name: collapse.name }
            )}
            variant={index % 2 ? 'primary' : 'secondary'}
          />
          <AccordionContent>
            <Box>
              <PermissionRow permissions={modifiedData[collapse.name]} name={collapse.name} />
            </Box>
          </AccordionContent>
        </Accordion>
      ))}
    </Stack>
  );
};

export default Permissions;
