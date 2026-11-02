import { SanitizedAdminUser } from '@strapi/admin/strapi-admin';
import { Box, Flex, Typography } from '@strapi/design-system';

import { STAGE_COLOR_DEFAULT } from '../../../../constants';
import { getStageColorByHex } from '../../../../utils/colors';
import { getDisplayName } from '../../../../utils/users';

interface StageColumnProps {
  strapi_stage?: {
    color?: string;
    name: string;
  } | null;
}

const StageColumn = (props: StageColumnProps) => {
  const { color = STAGE_COLOR_DEFAULT, name } = props.strapi_stage ?? {};
  const { themeColorName } = getStageColorByHex(color) ?? {};

  return (
    <Flex alignItems="center" gap={2} maxWidth="30rem">
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
  strapi_assignee?: Pick<
    SanitizedAdminUser,
    'firstname' | 'lastname' | 'username' | 'email'
  > | null;
}

const AssigneeColumn = (props: AssigneeColumnProps) => {
  const { strapi_assignee: user } = props;
  return <Typography textColor="neutral800">{user ? getDisplayName(user) : '-'}</Typography>;
};

export { StageColumn, AssigneeColumn };
export type { StageColumnProps, AssigneeColumnProps };
