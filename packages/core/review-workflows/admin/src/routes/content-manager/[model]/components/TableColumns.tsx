import { SanitizedAdminUser } from '@strapi/admin/strapi-admin';
import { Box, Flex, Typography } from '@strapi/design-system';

import { STAGE_COLOR_DEFAULT } from '../../../../constants';
import { getStageColorByHex } from '../../../../utils/colors';
import { getDisplayName } from '../../../../utils/users';

interface StageColumnProps {
  color?: string;
  name: string;
}

const StageColumn = ({ color = STAGE_COLOR_DEFAULT, name }: StageColumnProps) => {
  const { themeColorName } = getStageColorByHex(color) ?? {};

  return (
    <Flex alignItems="center" gap={2} maxWidth={`${300 / 16}rem`}>
      <Box
        height={2}
        background={color}
        borderColor={themeColorName === 'neutral0' ? 'neutral150' : undefined}
        hasRadius
        shrink={0}
        width={2}
      />

      <Typography fontWeight="regular" textColor="neutral700" ellipsis>
        {name}
      </Typography>
    </Flex>
  );
};

interface AssigneeColumnProps {
  user: Pick<SanitizedAdminUser, 'firstname' | 'lastname' | 'username' | 'email'>;
}

const AssigneeColumn = ({ user }: AssigneeColumnProps) => {
  return <Typography textColor="neutral800">{getDisplayName(user)}</Typography>;
};

export { StageColumn, AssigneeColumn };
export type { StageColumnProps, AssigneeColumnProps };
