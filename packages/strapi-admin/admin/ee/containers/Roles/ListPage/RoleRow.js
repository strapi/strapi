import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';
import { useGlobalContext } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';
import { Pencil, Duplicate } from '@buffetjs/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { RoleRow as RoleRowBase } from '../../../../src/components/Roles';

const RoleRow = ({ role, onRoleToggle, onRoleDuplicate, onRoleRemove, selectedRoles }) => {
  const { push } = useHistory();
  const { settingsBaseURL } = useGlobalContext();

  const handleRoleSelection = e => {
    e.stopPropagation();

    if (role.usersCount) {
      strapi.notification.info('Roles.ListPage.notification.delete-not-allowed');
    } else {
      onRoleToggle(role.id);
    }
  };

  const handleClickDelete = () => {
    if (role.usersCount) {
      strapi.notification.info('Roles.ListPage.notification.delete-not-allowed');
    } else {
      onRoleRemove(role.id);
    }
  };

  const prefix = (
    <Checkbox
      value={selectedRoles.findIndex(selectedRoleId => selectedRoleId === role.id) !== -1}
      onClick={handleRoleSelection}
      name="role-checkbox"
    />
  );

  return (
    <RoleRowBase
      selectedRoles={selectedRoles}
      prefix={prefix}
      role={role}
      links={[
        {
          icon: <Duplicate fill="#0e1622" />,
          onClick: () => onRoleDuplicate(role.id),
        },
        {
          icon: <Pencil fill="#0e1622" />,
          onClick: () => push(`${settingsBaseURL}/roles/${role.id}`),
        },
        {
          icon: <FontAwesomeIcon icon="trash-alt" />,
          onClick: handleClickDelete,
        },
      ]}
    />
  );
};

RoleRow.defaultProps = {
  selectedRoles: [],
};

RoleRow.propTypes = {
  onRoleToggle: PropTypes.func.isRequired,
  onRoleDuplicate: PropTypes.func.isRequired,
  onRoleRemove: PropTypes.func.isRequired,
  role: PropTypes.object.isRequired,
  selectedRoles: PropTypes.arrayOf(PropTypes.number),
};

export default RoleRow;
