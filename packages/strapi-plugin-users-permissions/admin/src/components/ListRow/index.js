import React from 'react';
import { CustomRow } from '@buffetjs/styles';
import { IconLinks } from '@buffetjs/core';
import PropTypes from 'prop-types';
import PrefixedIcon from '../PrefixedIcon';

const ListRow = ({ icon, name, onClick, links, children }) => {
  return (
    <CustomRow onClick={onClick}>
      <td>
        <PrefixedIcon icon={icon} name={name} />
      </td>
      {children}
      <td>
        <IconLinks links={links} />
      </td>
    </CustomRow>
  );
};

ListRow.defaultProps = {
  children: null,
  onClick: () => {},
  links: [],
};

ListRow.propTypes = {
  children: PropTypes.node,
  icon: PropTypes.array.isRequired,
  links: PropTypes.array,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default ListRow;
