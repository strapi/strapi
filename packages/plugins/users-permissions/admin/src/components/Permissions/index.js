import React, { memo, useCallback, useReducer } from 'react';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/parts/Accordion';
import { useIntl } from 'react-intl';
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

  const handleToggle = useCallback(index => {
    dispatch({
      type: 'TOGGLE_COLLAPSE',
      index,
    });
  }, []);

  return (
    <>
      {collapses.map((collapse, index) => (
        <Accordion
          expanded={collapse.isOpen}
          toggle={() => handleToggle(index)}
          key={collapse.name}
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
            <PermissionRow permissions={modifiedData[collapse.name]} name={collapse.name} />
          </AccordionContent>
        </Accordion>
      ))}
    </>
  );
};

export default memo(Permissions);
