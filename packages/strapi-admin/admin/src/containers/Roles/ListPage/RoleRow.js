import React from 'react';
import PropTypes from 'prop-types';
import { CustomRow } from '@buffetjs/styles';
import { IconLinks, Checkbox, Text } from '@buffetjs/core';
import { Pencil, Duplicate } from '@buffetjs/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import RoleDescription from './RoleDescription';

const RoleRow = ({
  description,
  name,
  numberOfUsers,
  onClick,
  onRoleToggle,
  roleId,
  selectedRoleIds,
}) => {
  const handleRoleSelection = e => {
    onRoleToggle(roleId);
    e.stopPropagation();
  };

  return (
    <CustomRow onClick={onClick}>
      <td>
        <Checkbox
          disabled={false}
          value={selectedRoleIds.findIndex(selectedRoleId => selectedRoleId === roleId) !== -1}
          onClick={handleRoleSelection}
          name="role-checkbox"
        />
      </td>
      <td>
        <Text>{name}</Text>
      </td>
      <td>
        <RoleDescription>{description}</RoleDescription>
      </td>
      <td>
        <Text>{`${numberOfUsers} users`}</Text>
      </td>
      <td>
        <IconLinks
          links={[
            {
              icon: <Duplicate fill="#0e1622" />,
              onClick: () => console.log('duplicates', roleId),
            },
            {
              icon: <Pencil fill="#0e1622" />,
              onClick: () => console.log('edit', roleId),
            },
            {
              icon: <FontAwesomeIcon icon="trash-alt" />,
              onClick: () => console.log('delete', roleId),
            },
          ]}
        />
      </td>
    </CustomRow>
  );
};

RoleRow.defaultProps = {
  description: null,
  name: null,
  onClick: null,
  selectedRoleIds: [],
};

RoleRow.propTypes = {
  description: PropTypes.string,
  name: PropTypes.string,
  numberOfUsers: PropTypes.number.isRequired,
  onClick: PropTypes.func,
  onRoleToggle: PropTypes.func.isRequired,
  roleId: PropTypes.number.isRequired,
  selectedRoleIds: PropTypes.arrayOf(PropTypes.number),
};

export default RoleRow;
