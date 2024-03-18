import React from 'react';

import { Flex, IconButton, Link, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { onRowClick, stopPropagation } from '@strapi/helper-plugin';
import { Pencil, Trash } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const EditLink = styled(Link)`
  align-items: center;
  height: ${32 / 16}rem;
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spaces[2]}}`};
  width: ${32 / 16}rem;

  svg {
    height: ${12 / 16}rem;
    width: ${12 / 16}rem;

    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }

  &:hover,
  &:focus {
    svg {
      path {
        fill: ${({ theme }) => theme.colors.neutral800};
      }
    }
  }
`;

const TableBody = ({ sortedRoles, canDelete, canUpdate, setRoleToDelete, onDelete }) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const [showConfirmDelete, setShowConfirmDelete] = onDelete;

  const checkCanDeleteRole = (role) =>
    canDelete && !['public', 'authenticated'].includes(role.type);

  const handleClickDelete = (id) => {
    setRoleToDelete(id);
    setShowConfirmDelete(!showConfirmDelete);
  };

  return (
    <Tbody>
      {sortedRoles?.map((role) => (
        <Tr key={role.name} {...onRowClick({ fn: () => navigate(role.id.toString()) })}>
          <Td width="20%">
            <Typography>{role.name}</Typography>
          </Td>
          <Td width="50%">
            <Typography>{role.description}</Typography>
          </Td>
          <Td width="30%">
            <Typography>
              {formatMessage(
                {
                  id: 'Roles.RoleRow.user-count',
                  defaultMessage: '{number, plural, =0 {# user} one {# user} other {# users}}',
                },
                { number: role.nb_users }
              )}
            </Typography>
          </Td>
          <Td>
            <Flex justifyContent="end" {...stopPropagation}>
              {canUpdate ? (
                <EditLink
                  to={role.id.toString()}
                  aria-label={formatMessage(
                    { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
                    { target: `${role.name}` }
                  )}
                >
                  <Pencil />
                </EditLink>
              ) : null}

              {checkCanDeleteRole(role) && (
                <IconButton
                  onClick={() => handleClickDelete(role.id.toString())}
                  noBorder
                  icon={<Trash />}
                  label={formatMessage(
                    { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
                    { target: `${role.name}` }
                  )}
                />
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
  canUpdate: false,
};

TableBody.propTypes = {
  onDelete: PropTypes.array.isRequired,
  permissions: PropTypes.object.isRequired,
  setRoleToDelete: PropTypes.func.isRequired,
  sortedRoles: PropTypes.array.isRequired,
  canDelete: PropTypes.bool,
  canUpdate: PropTypes.bool,
};
