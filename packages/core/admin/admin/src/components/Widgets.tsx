import { useAuth } from '@strapi/admin/strapi-admin';
import { Avatar, Badge, Box, Flex, Typography } from '@strapi/design-system';
import { Alien, Earth, File, Images, User, Key } from '@strapi/icons';
import { styled } from 'styled-components';

import { useGetKeyStatisticsQuery } from '../services/homepage';
import { getDisplayName, getInitials } from '../utils/users';

import { Widget } from './WidgetHelpers';

/* -------------------------------------------------------------------------------------------------
 * ProfileWidget
 * -----------------------------------------------------------------------------------------------*/

const DisplayNameTypography = styled(Typography)`
  font-size: 2.4rem;
`;

const ProfileWidget = () => {
  const user = useAuth('User', (state) => state.user);
  const userDisplayName = getDisplayName(user);
  const initials = getInitials(user);

  return (
    <Flex direction="column" gap={3} height="100%" justifyContent="center">
      <Avatar.Item delayMs={0} fallback={initials} />
      {userDisplayName && (
        <DisplayNameTypography fontWeight="bold" textTransform="none" textAlign="center">
          {userDisplayName}
        </DisplayNameTypography>
      )}
      {user?.email && (
        <Typography variant="omega" textColor="neutral600">
          {user?.email}
        </Typography>
      )}
      {user?.roles?.length && (
        <Flex marginTop={2} gap={1} wrap="wrap">
          {user?.roles?.map((role) => <Badge key={role.id}>{role.name}</Badge>)}
        </Flex>
      )}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Key Statistics
 * -----------------------------------------------------------------------------------------------*/
const Grid = styled(Box)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0; /* or gap: 1px; for borders */
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
`;

const GridCell = styled(Box)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
  display: flex;
  flex-direction: row;
  align-items: flex-start;

  &:nth-child(2n) {
    border-right: none;
  }
  &:nth-last-child(-n + 2) {
    border-bottom: none;
  }
`;

const KeyStatisticsWidget = () => {
  const { data, isLoading } = useGetKeyStatisticsQuery();

  const mapping: {
    [key: string]: {
      label: string;
      icon: {
        file: React.ReactNode;
        background: string;
        color: string;
      };
    };
  } = {
    entries: {
      label: 'Entries',
      icon: {
        file: <File />,
        background: 'primary100',
        color: 'primary600',
      },
    },
    assets: {
      label: 'Assets',
      icon: {
        file: <Images />,
        background: 'warning100',
        color: 'warning600',
      },
    },
    contentTypes: {
      label: 'Content-Types',
      icon: {
        file: <Alien />,
        background: 'secondary100',
        color: 'secondary600',
      },
    },
    components: {
      label: 'Components',
      icon: {
        file: <Alien />,
        background: 'alternative100',
        color: 'alternative600',
      },
    },
    locales: {
      label: 'Locales',
      icon: {
        file: <Earth />,
        background: 'success100',
        color: 'success600',
      },
    },
    admins: {
      label: 'Admins',
      icon: {
        file: <User />,
        background: 'danger100',
        color: 'danger600',
      },
    },
    webhooks: {
      label: 'Webhooks',
      icon: {
        file: <Alien />,
        background: 'alternative100',
        color: 'alternative600',
      },
    },
    apiTokens: {
      label: 'API Tokens',
      icon: {
        file: <Key />,
        background: 'neutral100',
        color: 'neutral600',
      },
    },
  };

  if (isLoading) {
    return <Widget.Loading />;
  }

  if (!data) {
    return <Widget.Error />;
  }

  return (
    <Grid>
      {Object.entries(data).map(([key, value]) => (
        <GridCell key={`key-statistics-${key}`} padding={3}>
          <Flex alignItems="center" gap={2}>
            {mapping[key] && (
              <Flex
                padding={2}
                borderRadius={1}
                background={mapping[key].icon.background}
                color={mapping[key].icon.color}
              >
                {mapping[key].icon.file}
              </Flex>
            )}
            <Flex direction="column" alignItems="flex-start">
              <Typography variant="pi" fontWeight="bold" textColor="neutral500">
                {mapping[key].label || key}
              </Typography>
              <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                {value}
              </Typography>
            </Flex>
          </Flex>
        </GridCell>
      ))}
    </Grid>
  );
};

export { ProfileWidget, KeyStatisticsWidget };
