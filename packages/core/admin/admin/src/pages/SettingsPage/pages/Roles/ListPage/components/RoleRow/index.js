import React from 'react';

import { Box, Flex, IconButton, Td, Tr, Typography } from '@strapi/design-system';
import { onRowClick, pxToRem, stopPropagation } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const RoleRow = ({ id, name, description, usersCount, icons, rowIndex, canUpdate }) => {
  const { formatMessage } = useIntl();
  const [, editObject] = icons;

  const usersCountText = formatMessage(
    {
      id: `Roles.RoleRow.user-count`,
      defaultMessage: '{number, plural, =0 {#  user} one {#  user} other {# users}}',
    },
    { number: usersCount }
  );

  return (
    <Tr
      aria-rowindex={rowIndex}
      key={id}
      {...(canUpdate
        ? onRowClick({
            fn: editObject.onClick,
          })
        : {})}
    >
      <Td maxWidth={pxToRem(130)}>
        <Typography ellipsis textColor="neutral800">
          {name}
        </Typography>
      </Td>
      <Td maxWidth={pxToRem(250)}>
        <Typography ellipsis textColor="neutral800">
          {description}
        </Typography>
      </Td>
      <Td>
        <Typography textColor="neutral800">{usersCountText}</Typography>
      </Td>
      <Td>
        <Flex justifyContent="flex-end" {...stopPropagation}>
          {icons.map((icon, i) =>
            icon ? (
              <Box key={icon.label} paddingLeft={i === 0 ? 0 : 1}>
                <IconButton onClick={icon.onClick} label={icon.label} noBorder icon={icon.icon} />
              </Box>
            ) : null
          )}
        </Flex>
      </Td>
    </Tr>
  );
};

RoleRow.propTypes = {
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  usersCount: PropTypes.number.isRequired,
  icons: PropTypes.array.isRequired,
  rowIndex: PropTypes.number.isRequired,
  canUpdate: PropTypes.bool,
};

RoleRow.defaultProps = {
  canUpdate: false,
};

export default RoleRow;
