import { Box, Flex, IconButton, IconButtonProps, Td, Tr, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { Table } from '../../../../../components/Table';
import type { AdminRole } from '../../../../../hooks/useAdminRoles';

interface RoleRowProps {
  role: AdminRole;
  headers: Table.Header<AdminRole, object>[];
  icons: Array<Required<Pick<IconButtonProps, 'children' | 'label' | 'onClick'>>>;
  rowIndex: number;
  canUpdate?: boolean;
  cursor?: string;
}

const RoleRow = ({ role, headers, icons, rowIndex, canUpdate, cursor }: RoleRowProps) => {
  const { formatMessage } = useIntl();
  const [, editObject] = icons;

  const usersCountText = formatMessage(
    {
      id: `Roles.RoleRow.user-count`,
      defaultMessage: '{number, plural, =0 {#  user} one {#  user} other {# users}}',
    },
    { number: role.usersCount }
  );

  return (
    <Tr
      cursor={cursor}
      aria-rowindex={rowIndex}
      key={role.id}
      // @ts-expect-error – the prop uses `HTMLButtonElement` but we just specify `HTMLElement`
      onClick={canUpdate ? editObject.onClick : undefined}
    >
      {headers.map((header) => {
        switch (header.name) {
          case 'name':
            return (
              <Td key={header.name} maxWidth={`13rem`}>
                <Typography ellipsis textColor="neutral800">
                  {role.name}
                </Typography>
              </Td>
            );
          case 'description':
            return (
              <Td key={header.name} maxWidth={`25rem`}>
                <Typography ellipsis textColor="neutral800">
                  {role.description}
                </Typography>
              </Td>
            );
          case 'usersCount':
            return (
              <Td key={header.name}>
                <Typography textColor="neutral800">{usersCountText}</Typography>
              </Td>
            );
          default:
            return <Td key={header.name}>{header.cellFormatter?.(role, header)}</Td>;
        }
      })}
      <Td>
        <Flex justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          {icons.map((icon, i) => {
            if (icon) {
              return (
                <Box key={icon.label} paddingLeft={i === 0 ? 0 : 1}>
                  <IconButton {...icon} variant="ghost" />
                </Box>
              );
            }

            return null;
          })}
        </Flex>
      </Td>
    </Tr>
  );
};

export { RoleRow };
export type { RoleRowProps };
