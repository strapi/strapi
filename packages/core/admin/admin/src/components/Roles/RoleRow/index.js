import { Box, Row, Td, Text, Tr, IconButton, BaseCheckbox } from '@strapi/parts';
import PropTypes from 'prop-types';
import React from 'react';
import { useIntl } from 'react-intl';

const RoleRow = ({ onToggle, id, name, description, usersCount, isChecked, icons }) => {
  const { formatMessage } = useIntl();

  const usersCountText = formatMessage(
    {
      id: `Roles.RoleRow.user-count.${usersCount > 1 ? 'plural' : 'singular'}`,
      defaultMessage: '{number} user',
    },
    { number: usersCount }
  );

  return (
    <Tr key={id}>
      {Boolean(onToggle) && (
        <Td>
          <BaseCheckbox
            name="role-checkbox"
            onValueChange={() => onToggle(id)}
            value={isChecked}
            aria-label={formatMessage(
              { id: `Roles.RoleRow.select-all`, defaultMessage: 'Select {name} for bulk actions' },
              { name }
            )}
          />
        </Td>
      )}
      <Td>
        <Text textColor="neutral800">{name}</Text>
      </Td>
      <Td>
        <Text textColor="neutral800">{description}</Text>
      </Td>
      <Td>
        <Text textColor="neutral800">{usersCountText}</Text>
      </Td>
      <Td>
        <Row>
          {icons.map((icon, i) =>
            icon ? (
              <Box key={icon.label} paddingLeft={i === 0 ? 0 : 1}>
                <IconButton onClick={icon.onClick} label={icon.label} noBorder icon={icon.icon} />
              </Box>
            ) : null
          )}
        </Row>
      </Td>
    </Tr>
  );
};

RoleRow.defaultProps = {
  onToggle: undefined,
  isChecked: undefined,
};

RoleRow.propTypes = {
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  usersCount: PropTypes.number.isRequired,
  icons: PropTypes.array.isRequired,
  onToggle: PropTypes.func,
  isChecked: PropTypes.bool,
};

export default RoleRow;
