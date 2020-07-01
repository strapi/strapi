import React, { useEffect } from 'react';
import { List, Header } from '@buffetjs/custom';
import { Pencil } from '@buffetjs/icons';
import matchSorter from 'match-sorter';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { useGlobalContext, useQuery, useUserPermissions } from 'strapi-helper-plugin';
import adminPermissions from '../../../permissions';
import PageTitle from '../../../components/SettingsPageTitle';
import { EmptyRole, RoleListWrapper, RoleRow } from '../../../components/Roles';
import { useRolesList, useSettingsHeaderSearchContext } from '../../../hooks';
import UpgradePlanModal from '../../../components/UpgradePlanModal';
import BaselineAlignment from './BaselineAlignment';

const RoleListPage = () => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const { settingsBaseURL } = useGlobalContext();
  const { roles, isLoading } = useRolesList();
  const { toggleHeaderSearch } = useSettingsHeaderSearchContext();
  const {
    allowedActions: { canUpdate },
  } = useUserPermissions(adminPermissions.settings.roles);
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
      <PageTitle name="Roles" />
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
        // Show a loader in the header while requesting data
        isLoading={isLoading}
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
              canUpdate={canUpdate}
              links={[
                {
                  icon: canUpdate ? <Pencil fill="#0e1622" /> : null,
                  onClick: () => push(`${settingsBaseURL}/roles/${role.id}`),
                },
              ]}
              role={role}
            />
          )}
        />
        {!resultsCount && !isLoading && <EmptyRole />}
      </RoleListWrapper>
      <UpgradePlanModal />
    </>
  );
};

export default RoleListPage;
