import React, { useCallback } from 'react';
import { List, Header } from '@buffetjs/custom';
import { Pencil } from '@buffetjs/icons';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useUserPermissions } from 'strapi-helper-plugin';

import permissions from '../../../permissions';
import { EmptyRole, RoleListWrapper, RoleRow } from '../../../components/Roles';
import { useRolesList } from '../../../hooks';
import BaselineAlignment from './BaselineAlignment';
import pluginId from '../../../pluginId';

const RoleListPage = () => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const { roles, isLoading } = useRolesList();
  const {
    allowedActions: { canUpdate, canDelete },
  } = useUserPermissions(permissions.accessRoles);

  const handleGoTo = useCallback(id => {
    if (canUpdate) {
      push(`/settings/${pluginId}/roles/${id}`);
    }
  }, []);

  const handleToggle = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <>
      <Header
        icon
        title={{
          label: formatMessage({
            id: 'Settings.roles.title',
            defaultMessage: 'Roles & Permissions',
          }),
        }}
        content={formatMessage({
          id: 'Settings.roles.list.description',
          defaultMessage: 'Define the roles and permissions for your users.',
        })}
        // Show a loader in the header while requesting data
        isLoading={isLoading}
      />
      <BaselineAlignment />
      <RoleListWrapper>
        <List
          title={formatMessage(
            {
              id: `Settings.roles.list.title${roles.length > 1 ? '.plural' : '.singular'}`,
            },
            { number: roles.length }
          )}
          items={roles}
          isLoading={isLoading}
          customRowComponent={role => (
            <RoleRow
              onClick={() => handleGoTo(role.id)}
              canUpdate={canUpdate}
              links={[
                {
                  icon: canUpdate ? <Pencil fill="#0e1622" /> : null,
                  onClick: () => {
                    handleGoTo(role.id);
                  },
                },
                {
                  icon: canDelete ? <FontAwesomeIcon icon="trash-alt" /> : null,
                  onClick: handleToggle,
                },
              ]}
              role={role}
            />
          )}
        />
        {!roles && !isLoading && <EmptyRole />}
      </RoleListWrapper>
    </>
  );
};

export default RoleListPage;
