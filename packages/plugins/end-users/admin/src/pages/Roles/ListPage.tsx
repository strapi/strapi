import * as React from 'react';

import { Layouts, Page, SearchInput, useQueryParams, useRBAC } from '@strapi/admin/strapi-admin';
import {
  Button,
  Flex,
  IconButton,
  Table,
  Tbody,
  Td,
  TFooter,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Duplicate, Pencil, Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { PERMISSIONS } from '../../constants';
import { useGetRolesQuery } from '../../services/roles';
import { getTranslation } from '../../utils/getTranslation';

import { DeleteRoleDialog } from './components/DeleteRoleDialog';
import { ImportRoleButton } from './components/ImportRoleButton';

import type { RoleListItem, RoleType } from '../../../../shared/contracts/roles';

const TYPE_ORDER: Record<RoleType, number> = { public: 0, authenticated: 1, custom: 2 };

/** Public and Authenticated first, as the mockup lists them, then the custom roles by name. */
const sortRoles = (roles: RoleListItem[]) =>
  [...roles].sort(
    (a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.name.localeCompare(b.name)
  );

const ListPage = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const [{ query }] = useQueryParams<{ _q?: string }>();
  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canCreate, canUpdate, canDelete },
  } = useRBAC(PERMISSIONS.roles);
  const { data: roles, isLoading, error } = useGetRolesQuery();
  const [roleToDelete, setRoleToDelete] = React.useState<RoleListItem | null>(null);

  const search = typeof query?._q === 'string' ? query._q.trim() : '';

  const sortedRoles = React.useMemo(() => sortRoles(roles ?? []), [roles]);
  const shownRoles = React.useMemo(
    () => sortedRoles.filter((role) => role.name.toLowerCase().includes(search.toLowerCase())),
    [sortedRoles, search]
  );
  const defaultRole = sortedRoles.find((role) => role.type === 'authenticated');

  if (isLoading || isLoadingPermissions) {
    return <Page.Loading />;
  }

  if (error || !roles) {
    return <Page.Error />;
  }

  const title = formatMessage({ id: getTranslation('roles.list.title'), defaultMessage: 'Roles' });
  const addLabel = formatMessage({
    id: getTranslation('roles.list.add'),
    defaultMessage: 'Add new role',
  });

  const handleAdd = () => navigate('new');

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings — {name}' },
          { name: title }
        )}
      </Page.Title>
      <Layouts.Header
        primaryAction={
          canCreate ? (
            <Flex gap={2}>
              <ImportRoleButton />
              <Button onClick={handleAdd} startIcon={<Plus />} size="S">
                {addLabel}
              </Button>
            </Flex>
          ) : null
        }
        title={title}
        subtitle={formatMessage({
          id: getTranslation('roles.list.subtitle'),
          defaultMessage: 'List of roles',
        })}
      />
      <Layouts.Action
        startActions={
          <SearchInput
            label={formatMessage({
              id: getTranslation('roles.list.search'),
              defaultMessage: 'Search roles',
            })}
          />
        }
      />
      <Layouts.Content>
        <Table
          colCount={4}
          rowCount={shownRoles.length + 1}
          footer={
            canCreate ? (
              <TFooter cursor="pointer" onClick={handleAdd} icon={<Plus />}>
                {addLabel}
              </TFooter>
            ) : null
          }
        >
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({ id: 'global.description', defaultMessage: 'Description' })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({ id: 'global.users', defaultMessage: 'Users' })}
                </Typography>
              </Th>
              <Th>
                <VisuallyHidden>
                  {formatMessage({ id: 'global.actions', defaultMessage: 'Actions' })}
                </VisuallyHidden>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {shownRoles.length === 0 && search !== '' && (
              <Tr>
                <Td colSpan={4}>
                  <Typography textColor="neutral600">
                    {formatMessage(
                      {
                        id: getTranslation('roles.list.empty-search'),
                        defaultMessage: 'No roles match “{query}”.',
                      },
                      { query: search }
                    )}
                  </Typography>
                </Td>
              </Tr>
            )}
            {shownRoles.map((role) => {
              const isBuiltIn = role.type !== 'custom';
              const deleteLabel = formatMessage(
                { id: getTranslation('roles.list.delete'), defaultMessage: 'Delete {name}' },
                { name: role.name }
              );

              return (
                <Tr
                  key={role.documentId}
                  cursor={canUpdate ? 'pointer' : undefined}
                  onClick={canUpdate ? () => navigate(role.documentId) : undefined}
                >
                  <Td maxWidth="13rem">
                    <Typography ellipsis textColor="neutral800">
                      {role.name}
                    </Typography>
                  </Td>
                  <Td maxWidth="25rem">
                    <Typography ellipsis textColor="neutral800">
                      {role.description}
                    </Typography>
                  </Td>
                  <Td>
                    {role.type === 'public' ? (
                      <Typography textColor="neutral600">
                        {formatMessage({
                          id: getTranslation('roles.list.users.public'),
                          defaultMessage: 'Not signed in',
                        })}
                      </Typography>
                    ) : (
                      <Typography textColor="neutral800">
                        {formatMessage(
                          {
                            id: getTranslation('roles.list.users'),
                            defaultMessage: '{count, plural, one {# user} other {# users}}',
                          },
                          { count: role.usersCount }
                        )}
                      </Typography>
                    )}
                  </Td>
                  <Td>
                    <Flex justifyContent="flex-end" gap={1} onClick={(e) => e.stopPropagation()}>
                      {canCreate && (
                        <IconButton
                          variant="ghost"
                          label={formatMessage(
                            {
                              id: getTranslation('roles.list.duplicate'),
                              defaultMessage: 'Duplicate {name}',
                            },
                            { name: role.name }
                          )}
                          onClick={() => navigate(`duplicate/${role.documentId}`)}
                        >
                          <Duplicate />
                        </IconButton>
                      )}
                      {canUpdate && (
                        <IconButton
                          variant="ghost"
                          label={formatMessage(
                            {
                              id: getTranslation('roles.list.edit'),
                              defaultMessage: 'Edit {name}',
                            },
                            { name: role.name }
                          )}
                          onClick={() => navigate(role.documentId)}
                        >
                          <Pencil />
                        </IconButton>
                      )}
                      {/* Public and Authenticated stay: there is nothing to delete, so no button */}
                      {canDelete && !isBuiltIn && (
                        <IconButton
                          variant="ghost"
                          label={deleteLabel}
                          onClick={() => setRoleToDelete(role)}
                        >
                          <Trash />
                        </IconButton>
                      )}
                    </Flex>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Layouts.Content>
      <DeleteRoleDialog
        role={roleToDelete}
        defaultRole={defaultRole}
        onClose={() => setRoleToDelete(null)}
      />
    </Page.Main>
  );
};

export { ListPage };
