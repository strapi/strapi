import { Box, Flex, IconButton, IconButtonProps, Td, Tr, Typography } from '@strapi/design-system';
import { onRowClick, pxToRem, stopPropagation } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import type { AdminRole } from '../../../../../hooks/useAdminRoles';

interface RoleRowProps extends Pick<AdminRole, 'id' | 'name' | 'description' | 'usersCount'> {
  icons: Array<Required<Pick<IconButtonProps, 'icon' | 'label' | 'onClick'>>>;
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
      {...(canUpdate
        ? onRowClick({
            // @ts-expect-error – the prop uses `HTMLButtonElement` but we just specify `HTMLElement`
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
                <IconButton
                  onClick={icon.onClick}
                  label={icon.label}
                  borderWidth={0}
                  icon={icon.icon}
                />
              </Box>
            ) : null
          )}
        </Flex>
      </Td>
    </Tr>
  );
};

export { RoleRow };
export type { RoleRowProps };
