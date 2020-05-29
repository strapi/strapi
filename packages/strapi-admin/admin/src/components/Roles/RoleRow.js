import React from 'react';
import PropTypes from 'prop-types';
import { CustomRow } from '@buffetjs/styles';
import { IconLinks, Text } from '@buffetjs/core';

import RoleDescription from './RoleDescription';

const RoleRow = ({ role, onClick, links, prefix }) => {
  return (
    <CustomRow onClick={onClick}>
      {prefix && <td>{prefix}</td>}
      <td>
        <Text>{role.name}</Text>
      </td>
      <td>
        <RoleDescription>{role.description}</RoleDescription>
      </td>
      <td>
        <Text>123</Text>
      </td>
      <td>
        <IconLinks links={links} />
      </td>
    </CustomRow>
  );
};

RoleRow.defaultProps = {
  onClick: null,
  prefix: null,
};

RoleRow.propTypes = {
  links: PropTypes.array.isRequired,
  onClick: PropTypes.func,
  prefix: PropTypes.node,
  role: PropTypes.object.isRequired,
};

export default RoleRow;
