import React, { useEffect } from 'react';
import { List, Header } from '@buffetjs/custom';
import { Pencil } from '@buffetjs/icons';
import matchSorter from 'match-sorter';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { useGlobalContext, useQuery } from 'strapi-helper-plugin';

import { EmptyRole, RoleListWrapper, RoleRow } from '../../../components/Roles';
import { useRolesList, useSettingsHeaderSearchContext } from '../../../hooks';
import BaselineAlignment from './BaselineAlignment';

const RoleListPage = () => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const { settingsBaseURL } = useGlobalContext();
  const { roles, isLoading } = useRolesList();
  const { toggleHeaderSearch } = useSettingsHeaderSearchContext();
  const query = useQuery();
  const _q = decodeURIComponent(query.get('_q') || '');
  const results = matchSorter(roles, _q, { keys: ['name', 'description'] });

  useEffect(() => {
    toggleHeaderSearch({ id: 'Settings.permissions.menu.link.roles.label' });

    return () => {
      toggleHeaderSearch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resultsCount = results.length;

  return (
    <>
      <Header
        icon
        title={{
          label: formatMessage({
            id: 'Settings.roles.title',
            defaultMessage: 'roles',
          }),
        }}
        content={formatMessage({
          id: 'Settings.roles.list.description',
          defaultMessage: 'List of roles',
        })}
      />
      <BaselineAlignment />
      <RoleListWrapper>
        <List
          title={formatMessage(
            {
              id: `Settings.roles.list.title${results.length > 1 ? '.plural' : '.singular'}`,
            },
            { number: resultsCount }
          )}
          items={results}
          isLoading={isLoading}
          customRowComponent={role => (
            <RoleRow
              links={[
                {
                  icon: <Pencil fill="#0e1622" />,
                  onClick: () => push(`${settingsBaseURL}/roles/${role.id}`),
                },
              ]}
              role={role}
            />
          )}
        />
        {!resultsCount && !isLoading && <EmptyRole />}
      </RoleListWrapper>
    </>
  );
};

export default RoleListPage;
