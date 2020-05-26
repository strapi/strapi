import React from 'react';
import { List, Header } from '@buffetjs/custom';
import { Pencil } from '@buffetjs/icons';
import { useIntl } from 'react-intl';

import { RoleListWrapper, RoleRow } from '../../../components/Roles';
import BaselineAlignment from './BaselineAlignment';
import useRolesList from '../../../hooks/useRolesList';

const RoleListPage = () => {
  const { formatMessage } = useIntl();
  const { roles, isLoading } = useRolesList();

  return (
    <>
      <Header
        icon
        title={{
          label: formatMessage({
            id: 'Settings.roles.title',
          }),
        }}
        content={formatMessage({
          id: 'Settings.roles.list.description',
        })}
      />
      <BaselineAlignment />
      <RoleListWrapper>
        <List
          title={`${roles.length} ${formatMessage({
            id: 'Settings.roles.title',
          })}`}
          items={roles}
          isLoading={isLoading}
          customRowComponent={role => (
            <RoleRow
              links={[
                {
                  icon: <Pencil fill="#0e1622" />,
                  onClick: () => console.log('edit', role.id),
                },
              ]}
              role={role}
            />
          )}
        />
      </RoleListWrapper>
    </>
  );
};

export default RoleListPage;
