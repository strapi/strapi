import React from 'react';
import PropTypes from 'prop-types';
import { CustomRow } from '@buffetjs/styles';
import { IconLinks, Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import RoleDescription from './RoleDescription';

const RoleRow = ({ role, onClick, links }) => {
  const { formatMessage } = useIntl();
  const number = role.nb_users;
  const text = formatMessage(
    { id: `Roles.RoleRow.user-count.${number > 1 ? 'plural' : 'singular'}` },
    { number }
  );

  return (
    <CustomRow onClick={onClick}>
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
};

RoleRow.propTypes = {
  links: PropTypes.array.isRequired,
  onClick: PropTypes.func,
  role: PropTypes.object.isRequired,
};

export default RoleRow;
