import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { SelectRoles } from './SelectRoles';

interface RoleSectionProps {
  disabled?: boolean;
}

export const RoleSection = ({ disabled }: RoleSectionProps) => {
  const { formatMessage } = useIntl();

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: 'Settings.serviceAccounts.roles.title',
            defaultMessage: "Service Account's roles",
          })}
        </Typography>
        <Grid.Root gap={5}>
          <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
            <SelectRoles disabled={disabled} />
          </Grid.Item>
        </Grid.Root>
      </Flex>
    </Box>
  );
};

