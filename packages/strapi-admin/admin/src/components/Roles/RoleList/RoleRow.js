import React from 'react';
import PropTypes from 'prop-types';
import { CustomRow } from '@buffetjs/styles';
import { IconLinks, Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import RoleDescription from './RoleDescription';

const RoleRow = ({ role, onClick, links, prefix }) => {
  const { formatMessage } = useIntl();
  const number = role.usersCount;
  const text = formatMessage(
    { id: `Roles.RoleRow.user-count.${number > 1 ? 'plural' : 'singular'}` },
    { number }
  );

  return (
    <CustomRow onClick={onClick}>
      {prefix && <td style={{ width: 55 }}>{prefix}</td>}
      <td>
        <Text fontWeight="semiBold">{role.name}</Text>
      </td>
      <td>
        <RoleDescription>{role.description}</RoleDescription>
      </td>
      <td>
        <Text>{text}</Text>
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
