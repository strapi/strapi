import React from 'react';
import { List, Header } from '@buffetjs/custom';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Pencil } from '@buffetjs/icons';

import { RoleListWrapper, RoleRow } from '../../../components/Roles';
import BaselineAlignment from './BaselineAlignment';
import useRoleList from '../../../hooks/useRoleList';

const RoleListPage = () => {
  const { formatMessage } = useGlobalContext();
  const { roles, isLoading } = useRoleList();

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
