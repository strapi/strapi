/**
 *
 * ListRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import { CustomRow as Row } from '@buffetjs/styles';
import { Checkbox, IconLinks } from '@buffetjs/core';
import Switch from '../Switch';

function ListRow({
  id,
  isEnabled,
  name,
  url,
  onEnabledChange,
  onDeleteCLick,
  onEditClick,
}) {
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
        onDeleteCLick(id);
      },
    },
  ];

  const handleEnabledChange = ({ target: { value } }) => {
    onEnabledChange(value, id);
  };

  return (
    <Row>
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
      </td>
    </Row>
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
