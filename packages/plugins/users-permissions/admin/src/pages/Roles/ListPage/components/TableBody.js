import React from 'react';

import { Flex, IconButton, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { CheckPermissions, onRowClick, stopPropagation } from '@strapi/helper-plugin';
import { Pencil, Trash } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';

import pluginId from '../../../../pluginId';

const TableBody = ({ sortedRoles, canDelete, permissions, setRoleToDelete, onDelete }) => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const [showConfirmDelete, setShowConfirmDelete] = onDelete;

  const checkCanDeleteRole = (role) =>
    canDelete && !['public', 'authenticated'].includes(role.type);

  const handleClickDelete = (id) => {
    setRoleToDelete(id);
    setShowConfirmDelete(!showConfirmDelete);
  };

  const handleClickEdit = (id) => {
    push(`/settings/${pluginId}/roles/${id}`);
  };

  return (
    <Tbody>
      {sortedRoles?.map((role) => (
        <Tr key={role.name} {...onRowClick({ fn: () => handleClickEdit(role.id) })}>
          <Td width="20%">
            <Typography>{role.name}</Typography>
          </Td>
          <Td width="50%">
            <Typography>{role.description}</Typography>
          </Td>
          <Td width="30%">
            <Typography>
              {formatMessage(
                { id: 'Roles.RoleRow.user-count', defaultMessage: '{number, plural, =0 {# user} one {# user} other {# users}}' },
                { number: role.nb_users }
              )}
            </Typography>
          </Td>
          <Td>
            <Flex justifyContent="end" {...stopPropagation}>
              <CheckPermissions permissions={permissions.updateRole}>
                <IconButton
                  onClick={() => handleClickEdit(role.id)}
                  noBorder
                  icon={<Pencil />}
                  label={formatMessage(
                    { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
                    { target: `${role.name}` }
                  )}
                />
              </CheckPermissions>
              {checkCanDeleteRole(role) && (
                <CheckPermissions permissions={permissions.deleteRole}>
                  <IconButton
                    onClick={() => handleClickDelete(role.id)}
                    noBorder
                    icon={<Trash />}
                    label={formatMessage(
                      { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
                      { target: `${role.name}` }
                    )}
                  />
                </CheckPermissions>
              )}
            </Flex>
          </Td>
        </Tr>
      ))}
    </Tbody>
  );
};

export default TableBody;

TableBody.defaultProps = {
  canDelete: false,
};

TableBody.propTypes = {
  onDelete: PropTypes.array.isRequired,
  permissions: PropTypes.object.isRequired,
  setRoleToDelete: PropTypes.func.isRequired,
  sortedRoles: PropTypes.array.isRequired,
  canDelete: PropTypes.bool,
};
