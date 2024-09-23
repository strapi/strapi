import { Box, Flex, IconButton, IconButtonProps, Td, Tr, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { AdminRole } from '../../../../../hooks/useAdminRoles';

interface RoleRowProps extends Pick<AdminRole, 'id' | 'name' | 'description' | 'usersCount'> {
  icons: Array<Required<Pick<IconButtonProps, 'children' | 'label' | 'onClick'>>>;
  rowIndex: number;
  canUpdate?: boolean;
}

const RoleRow = ({
  id,
  name,
  description,
  usersCount,
  icons,
  rowIndex,
  canUpdate,
}: RoleRowProps) => {
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
      // @ts-expect-error – the prop uses `HTMLButtonElement` but we just specify `HTMLElement`
      onClick={canUpdate ? editObject.onClick : undefined}
    >
      <Td maxWidth={`13rem`}>
        <Typography ellipsis textColor="neutral800">
          {name}
        </Typography>
      </Td>
      <Td maxWidth={`25rem`}>
        <Typography ellipsis textColor="neutral800">
          {description}
        </Typography>
      </Td>
      <Td>
        <Typography textColor="neutral800">{usersCountText}</Typography>
      </Td>
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
