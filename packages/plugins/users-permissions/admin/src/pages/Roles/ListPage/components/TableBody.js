import React from 'react';
import PropTypes from 'prop-types';
import { IconButton, Tbody, Text, Tr, Td, Row } from '@strapi/parts';
import { EditIcon, DeleteIcon } from '@strapi/icons';
import { CheckPermissions, onRowClick, stopPropagation } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';

import { getTrad } from '../../../../utils';
import pluginId from '../../../../pluginId';

const TableBody = ({ sortedRoles, canDelete, permissions, setRoleToDelete, onDelete }) => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const [showConfirmDelete, setShowConfirmDelete] = onDelete;

  const checkCanDeleteRole = role => canDelete && !['public', 'authenticated'].includes(role.type);

  const handleClickDelete = id => {
    setRoleToDelete(id);
    setShowConfirmDelete(!showConfirmDelete);
  };

  const handleClickEdit = id => {
    push(`/settings/${pluginId}/roles/${id}`);
  };

  return (
    <Tbody>
      {sortedRoles?.map(role => (
        <Tr key={role.name} {...onRowClick({ fn: () => handleClickEdit(role.id) })}>
          <Td width="20%">
            <Text>{role.name}</Text>
          </Td>
          <Td width="50%">
            <Text>{role.description}</Text>
          </Td>
          <Td width="30%">
            <Text>
              {`${role.nb_users} ${formatMessage({
                id: getTrad('Roles.users'),
                defaultMessage: 'users',
              }).toLowerCase()}`}
            </Text>
          </Td>
          <Td>
            <Row justifyContent="end" {...stopPropagation}>
              <CheckPermissions permissions={permissions.updateRole}>
                <IconButton
                  onClick={() => handleClickEdit(role.id)}
                  noBorder
                  icon={<EditIcon />}
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
                    icon={<DeleteIcon />}
                    label={formatMessage(
                      { id: 'app.component.table.delete', defaultMessage: 'Delete {target}' },
                      { target: `${role.name}` }
                    )}
                  />
                </CheckPermissions>
              )}
            </Row>
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
