import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Td, Tr } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import { IconButton } from '@strapi/design-system/IconButton';
import { stopPropagation, onRowClick, pxToRem } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

const RoleRow = ({ id, name, description, usersCount, icons, rowIndex }) => {
  const { formatMessage } = useIntl();

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
      {...onRowClick({
        fn: icons[1].onClick,
      })}
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
};

export default RoleRow;
