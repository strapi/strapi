import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';
import { Pencil, Duplicate } from '@buffetjs/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { RoleRow as RoleRowBase } from '../../../../src/components/Roles';

const RoleRow = ({ role, onRoleToggle, onRoleDuplicate, onRoleRemove, selectedRoles }) => {
  const handleRoleSelection = e => {
    onRoleToggle(role.id);
    e.stopPropagation();
  };

  return (
    <RoleRowBase
      selectedRoles={selectedRoles}
      prefix={
        <Checkbox
          value={selectedRoles.findIndex(selectedRoleId => selectedRoleId === role.id) !== -1}
          onClick={handleRoleSelection}
          name="role-checkbox"
        />
      }
      role={role}
      links={[
        {
          icon: <Duplicate fill="#0e1622" />,
          onClick: () => onRoleDuplicate(role.id),
        },
        {
          icon: <Pencil fill="#0e1622" />,
          onClick: () => console.log('edit', role.id),
        },
        {
          icon: <FontAwesomeIcon icon="trash-alt" />,
          onClick: () => onRoleRemove(role.id),
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
