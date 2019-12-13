/**
 *
 * ListRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import { CustomRow as Row } from '@buffetjs/styles';
import { IconLinks } from '@buffetjs/core';

function ListRow({ isEnabled, links, name, url }) {
  return (
    <Row>
      <td>
        <p>{name}</p>
      </td>
      <td>
        <p>{url}</p>
      </td>
      <td>
        <p>{isEnabled ? 'true' : 'false'}</p>
      </td>
      <td>
        <IconLinks links={links} />
      </td>
    </Row>
  );
}

ListRow.defaultProps = {
  isEnabled: false,
  links: null,
  name: null,
  url: null,
  headers: {},
  hooks: [],
};

ListRow.propTypes = {
  isEnabled: PropTypes.bool,
  links: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.node,
      onClick: PropTypes.func,
    })
  ),
  name: PropTypes.string,
  url: PropTypes.string,
  headers: PropTypes.object,
  hooks: PropTypes.instanceOf(Array),
};

export default ListRow;
