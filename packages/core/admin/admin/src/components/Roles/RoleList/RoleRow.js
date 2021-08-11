import { Box, Row, Td, Text, Tr, IconButton } from '@strapi/parts';
import PropTypes from 'prop-types';
import React from 'react';
import { useIntl } from 'react-intl';
import RoleDescription from './RoleDescription';

const RoleRow = ({ name, description, usersCount, icons }) => {
  const { formatMessage } = useIntl();

  const usersCountText = formatMessage(
    { id: `Roles.RoleRow.user-count.${usersCount > 1 ? 'plural' : 'singular'}` },
    { number: usersCount }
  );

  return (
    <Tr>
      <Td>
        <Text textColor="neutral800">{name}</Text>
      </Td>
      <Td>
        <RoleDescription textColor="neutral800">{description}</RoleDescription>
      </Td>
      <Td>
        <Text textColor="neutral800">{usersCountText}</Text>
      </Td>
      <Td>
        <Row>
          {icons.map((icon, i) =>
            icon ? (
              <Box key={icon.label} {...(i !== 0 && { paddingLeft: 1 })}>
                <IconButton onClick={icon.onClick} label={icon.label} noBorder icon={icon.icon} />
              </Box>
            ) : null
          )}
        </Row>
      </Td>
    </Tr>
  );
};

RoleRow.defaultProps = {};

RoleRow.propTypes = {
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  usersCount: PropTypes.number.isRequired,
  icons: PropTypes.array.isRequired,
};

export default RoleRow;
