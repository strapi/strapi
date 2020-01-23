/**
 *
 * ListRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, IconLinks } from '@buffetjs/core';

import Switch from '../Switch';
import StyledListRow from './StyledListRow';

function ListRow({
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
      icon: 'pencil',
      onClick: () => onEditClick(id),
    },
    {
      icon: 'trash',
      onClick: e => {
        e.stopPropagation();
        onDeleteCLick(id);
      },
    },
  ];

  const isChecked = itemsToDelete.includes(id);

  return (
    <StyledListRow onClick={() => onEditClick(id)}>
      <td>
        <Checkbox
          name={name}
          value={isChecked}
          onClick={e => e.stopPropagation()}
          onChange={({ target: { value } }) => onCheckChange(value, id)}
        />
      </td>
      <td>
        <p>{name}</p>
      </td>
      <td>
        <p title={url}>{url}</p>
      </td>
      <td>
        <div
          onClick={e => e.stopPropagation()}
          role="button"
          aria-hidden="true"
        >
          <Switch
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
