/**
 *
 * ListRow
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { PopUpWarning } from 'strapi-helper-plugin';
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
  const [showModal, setShowModal] = useState(false);

  const links = [
    {
      icon: 'pencil',
      onClick: e => {
        handleEditClick(e);
      },
    },
    {
      icon: 'trash',
      onClick: e => {
        e.stopPropagation();
        setShowModal(true);
      },
    },
  ];

  const isChecked = itemsToDelete.includes(id);

  const handleEditClick = () => {
    onEditClick(id);
  };

  const handleEnabledChange = ({ target: { value } }) => {
    onEnabledChange(value, id);
  };

  const handleCheckChange = ({ target: { value } }) => {
    onCheckChange(value, id);
  };

  const handleDeleteConfirm = () => {
    onDeleteCLick(id);
    setShowModal(false);
  };

  return (
    <>
      <StyledListRow onClick={handleEditClick}>
        <td>
          <Checkbox
            name={name}
            value={isChecked}
            onClick={e => e.stopPropagation()}
            onChange={handleCheckChange}
          />
        </td>
        <td>
          <p>{name}</p>
        </td>
        <td>
          <p title={url}>{url}</p>
        </td>
        <td>
          <div onClick={e => e.stopPropagation()}>
            <Switch
              name={name}
              value={isEnabled}
              onChange={handleEnabledChange}
            ></Switch>
          </div>
        </td>
        <td>
          <IconLinks links={links} />
          <div className="popup-wrapper">
            <PopUpWarning
              isOpen={showModal}
              toggleModal={() => setShowModal(!showModal)}
              popUpWarningType="danger"
              onConfirm={handleDeleteConfirm}
            />
          </div>
        </td>
      </StyledListRow>
    </>
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
  headers: {},
  hooks: [],
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
  headers: PropTypes.object,
  hooks: PropTypes.instanceOf(Array),
};

export default ListRow;
