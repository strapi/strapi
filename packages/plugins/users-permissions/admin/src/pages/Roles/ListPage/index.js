import React from 'react';
import { Button, HeaderLayout, Layout, Main } from '@strapi/parts';
import { AddIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useTracking, SettingsPageTitle, CheckPermissions } from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';

import { getTrad } from '../../../utils';
import pluginId from '../../../pluginId';
import permissions from '../../../permissions';

const RoleListPage = () => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { push } = useHistory();

  const handleNewRoleClick = () => {
    trackUsage('willCreateRole');
    push(`/settings/${pluginId}/roles/new`);
  };

  const pageTitle = formatMessage({
    id: getTrad('HeaderNav.link.roles'),
    defaultMessage: 'Roles',
  });

  return (
    <Layout>
      <SettingsPageTitle name={pageTitle} />
      <Main
        labelledBy={formatMessage({
          id: getTrad('HeaderNav.link.roles'),
          defaultMessage: 'Roles',
        })}
      >
        <HeaderLayout
          as="h1"
          id="roles"
          title={formatMessage({
            id: 'Settings.roles.title',
            defaultMessage: 'Roles',
          })}
          subtitle={formatMessage({
            id: 'Settings.roles.list.description',
            defaultMessage: 'List of roles',
          })}
          primaryAction={
            <CheckPermissions permissions={permissions.createRole}>
              <Button onClick={handleNewRoleClick} startIcon={<AddIcon />}>
                {formatMessage({
                  id: getTrad('List.button.roles'),
                  defaultMessage: 'Add new role',
                })}
              </Button>
            </CheckPermissions>
          }
        />
      </Main>
    </Layout>
  );
};

export default RoleListPage;
