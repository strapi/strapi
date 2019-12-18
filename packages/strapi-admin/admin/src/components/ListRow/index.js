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
  name,
  url,
  onEnabledChange,
  onDeleteCLick,
  onEditClick,
}) {
  const [showModal, setShowModal] = useState(false);

  const links = [
    {
      icon: 'pencil',
      onClick: () => {
        onEditClick(id);
      },
    },
    {
      icon: 'trash',
      onClick: () => {
        setShowModal(true);
      },
    },
  ];

  const handleEnabledChange = ({ target: { value } }) => {
    onEnabledChange(value, id);
  };

  const handleDeleteConfirm = () => {
    onDeleteCLick(id);
    setShowModal(false);
  };

  return (
    <>
      <StyledListRow>
        <td>
          <Checkbox name={name} value={false} onChange={() => {}} />
        </td>
        <td>
          <p>{name}</p>
        </td>
        <td>
          <p>{url}</p>
        </td>
        <td>
          <Switch
            name={name}
            value={isEnabled}
            onChange={handleEnabledChange}
          ></Switch>
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
  isEnabled: false,
  name: null,
  onDeleteCLick: () => {},
  onEditClick: () => {},
  onEnabledChange: () => {},
  url: null,
  headers: {},
  hooks: [],
};

ListRow.propTypes = {
  id: PropTypes.string.isRequired,
  isEnabled: PropTypes.bool,
  name: PropTypes.string,
  onDeleteCLick: PropTypes.func,
  onEditClick: PropTypes.func,
  onEnabledChange: PropTypes.func,
  url: PropTypes.string,
  headers: PropTypes.object,
  hooks: PropTypes.instanceOf(Array),
};

export default ListRow;
