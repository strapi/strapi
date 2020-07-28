import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';
import { Pencil, Duplicate } from '@buffetjs/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { RoleRow as RoleRowBase } from '../../../../../admin/src/components/Roles';
import Checkbox from './CustomCheckbox';

const RoleRow = ({
  canCreate,
  canDelete,
  canUpdate,
  role,
  onRoleToggle,
  onRoleDuplicate,
  onRoleRemove,
  selectedRoles,
}) => {
  const { push } = useHistory();
  const { settingsBaseURL } = useGlobalContext();

  const handleRoleSelection = e => {
    e.stopPropagation();

    onRoleToggle(role.id);
  };

  const handleClickDelete = e => {
    e.preventDefault();
    e.stopPropagation();

    if (role.usersCount) {
      strapi.notification.info('Roles.ListPage.notification.delete-not-allowed');
    } else {
      onRoleRemove(role.id);
    }
  };

  const handleGoTo = useCallback(() => {
    push(`${settingsBaseURL}/roles/${role.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.id, settingsBaseURL]);

  const prefix = canDelete ? (
    <Checkbox
      value={selectedRoles.findIndex(selectedRoleId => selectedRoleId === role.id) !== -1}
      onClick={handleRoleSelection}
      name="role-checkbox"
    />
  ) : null;

  return (
    <RoleRowBase
      onClick={handleGoTo}
      selectedRoles={selectedRoles}
      prefix={prefix}
      role={role}
      links={[
        {
          icon: canCreate ? <Duplicate fill="#0e1622" /> : null,
          onClick: e => {
            e.preventDefault();
            e.stopPropagation();
            onRoleDuplicate(role.id);
          },
        },
        {
          icon: canUpdate ? <Pencil fill="#0e1622" /> : null,
          onClick: handleGoTo,
        },
        {
          icon: canDelete ? <FontAwesomeIcon icon="trash-alt" /> : null,
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
  canCreate: PropTypes.bool.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canUpdate: PropTypes.bool.isRequired,
  onRoleToggle: PropTypes.func.isRequired,
  onRoleDuplicate: PropTypes.func.isRequired,
  onRoleRemove: PropTypes.func.isRequired,
  role: PropTypes.object.isRequired,
  selectedRoles: PropTypes.arrayOf(PropTypes.number),
};

export default RoleRow;
