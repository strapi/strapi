/**
 *
 * ListRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, IconLinks } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

import Switch from '../Switch';
import StyledListRow from './StyledListRow';

function ListRow({
  canDelete,
  canUpdate,
  id,
  isEnabled,
  itemsToDelete,
  name,
  url,
  onCheckChange,
  onEnabledChange,
  onDeleteCLick,
  onEditClick,
}) {
  const links = [
    {
      icon: canUpdate ? <FontAwesomeIcon icon={faPencilAlt} /> : null,
      onClick: () => onEditClick(id),
    },
    {
      icon: canDelete ? <FontAwesomeIcon icon={faTrashAlt} /> : null,
      onClick: e => {
        e.stopPropagation();
        onDeleteCLick(id);
      },
    },
  ];

  const handleClick = () => {
    if (canUpdate) {
      onEditClick(id);
    }
  };

  const isChecked = itemsToDelete.includes(id);

  return (
    <StyledListRow onClick={handleClick} disabled={!canUpdate}>
      {canDelete && (
        <td className="checkboxWrapper">
          <Checkbox
            name={name}
            value={isChecked}
            onClick={e => e.stopPropagation()}
            onChange={({ target: { value } }) => onCheckChange(value, id)}
          />
        </td>
      )}
      <td className="nameWrapper">
        <p>{name}</p>
      </td>
      <td className="urlWrapper">
        <p title={url}>{url}</p>
      </td>
      <td className="switchWrapper">
        <div onClick={e => e.stopPropagation()} role="button" aria-hidden="true">
          <Switch
            disabled={!canUpdate}
            name={name}
            value={isEnabled}
            onChange={({ target: { value } }) => onEnabledChange(value, id)}
          />
        </div>
      </td>
      <td>
        <IconLinks links={links} />
      </td>
    </StyledListRow>
  );
}

ListRow.defaultProps = {
  canDelete: false,
  canUpdate: false,
  itemsToDelete: [],
  isEnabled: false,
  name: null,
  onCheckChange: () => {},
  onDeleteCLick: () => {},
  onEditClick: () => {},
  onEnabledChange: () => {},
  url: null,
};

ListRow.propTypes = {
  canDelete: PropTypes.bool,
  canUpdate: PropTypes.bool,
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  itemsToDelete: PropTypes.instanceOf(Array),
  isEnabled: PropTypes.bool,
  name: PropTypes.string,
  onCheckChange: PropTypes.func,
  onDeleteCLick: PropTypes.func,
  onEditClick: PropTypes.func,
  onEnabledChange: PropTypes.func,
  url: PropTypes.string,
};

export default ListRow;
