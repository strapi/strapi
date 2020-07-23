import React, { useCallback, useEffect, useState } from 'react';
import { List, Header } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import { Duplicate, Pencil, Plus } from '@buffetjs/icons';
import matchSorter from 'match-sorter';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ListButton, useGlobalContext, useQuery, useUserPermissions } from 'strapi-helper-plugin';
import adminPermissions from '../../../permissions';
import PageTitle from '../../../components/SettingsPageTitle';
import { EmptyRole, RoleListWrapper, RoleRow } from '../../../components/Roles';
import { useRolesList, useSettingsHeaderSearchContext } from '../../../hooks';
import UpgradePlanModal from '../../../components/UpgradePlanModal';
import BaselineAlignment from './BaselineAlignment';

const RoleListPage = () => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const [isOpen, setIsOpen] = useState(false);
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

  const handleGoTo = useCallback(
    id => {
      push(`${settingsBaseURL}/roles/${id}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settingsBaseURL]
  );

  const handleToggle = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
  }, []);

  const headerActions = [
    {
      label: formatMessage({
        id: 'Settings.roles.list.button.add',
        defaultMessage: 'Add new role',
      }),
      onClick: handleToggle,
      color: 'primary',
      type: 'button',
      icon: true,
    },
  ];

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
        actions={headerActions}
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
              onClick={() => handleGoTo(role.id)}
              canUpdate={canUpdate}
              links={[
                {
                  icon: <Duplicate fill="#0e1622" />,
                  onClick: handleToggle,
                },
                {
                  icon: canUpdate ? <Pencil fill="#0e1622" /> : null,
                  onClick: () => {
                    handleGoTo(role.id);
                  },
                },
                {
                  icon: <FontAwesomeIcon icon="trash-alt" />,
                  onClick: handleToggle,
                },
              ]}
              role={role}
            />
          )}
        />
        {!resultsCount && !isLoading && <EmptyRole />}
        <ListButton>
          <Button
            onClick={handleToggle}
            icon={<Plus fill="#007eff" width="11px" height="11px" />}
            label={formatMessage({
              id: 'Settings.roles.list.button.add',
              defaultMessage: 'Add new role',
            })}
          />
        </ListButton>
      </RoleListWrapper>
      <UpgradePlanModal isOpen={isOpen} onToggle={handleToggle} />
    </>
  );
};

export default RoleListPage;
