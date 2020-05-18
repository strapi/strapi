import React, { useEffect, useState } from 'react';
import { List, Header } from '@buffetjs/custom';
import { useGlobalContext, request } from 'strapi-helper-plugin';
import { Pencil } from '@buffetjs/icons';

import { RoleListWrapper, RoleRow } from '../../../components/Roles';
import BaselineAlignment from './BaselineAlignment';

const RoleListPage = () => {
  const { formatMessage } = useGlobalContext();
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    fetchRoleList();
  }, []);

  const fetchRoleList = async () => {
    try {
      const { data } = await request('/admin/roles', { method: 'GET' });

      setRoles(data);
    } catch (e) {
      console.error(e);
    }
  };

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
