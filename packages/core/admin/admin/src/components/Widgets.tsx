import { useAuth } from '@strapi/admin/strapi-admin';
import { Avatar, Badge, Box, Flex, Typography } from '@strapi/design-system';
import { Alien, Earth, File, Images, User, Key } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetCountDocumentsQuery, useGetKeyStatisticsQuery } from '../services/homepage';
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
  gap: 0;
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
  const { formatMessage } = useIntl();
  const { data: countDocuments, isLoading: isLoadingCountDocuments } = useGetCountDocumentsQuery();
  const { data: countKeyStatistics, isLoading: isLoadingKeyStatistics } =
    useGetKeyStatisticsQuery();

  if (isLoadingKeyStatistics || isLoadingCountDocuments) {
    return <Widget.Loading />;
  }

  if (!countKeyStatistics || !countDocuments) {
    return <Widget.Error />;
  }

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
      label: formatMessage({ id: 'widget.key-statistics.list.entries' }),
      icon: {
        file: <File />,
        background: 'primary100',
        color: 'primary600',
      },
    },
    assets: {
      label: formatMessage({ id: 'widget.key-statistics.list.assets' }),
      icon: {
        file: <Images />,
        background: 'warning100',
        color: 'warning600',
      },
    },
    contentTypes: {
      label: formatMessage({ id: 'widget.key-statistics.list.contentTypes' }),
      icon: {
        file: <Alien />, // TODO: replace with a proper icon when https://github.com/strapi/design-system/pull/1943 is merged
        background: 'secondary100',
        color: 'secondary600',
      },
    },
    components: {
      label: formatMessage({ id: 'widget.key-statistics.list.components' }),
      icon: {
        file: <Alien />, // TODO: replace with a proper icon when https://github.com/strapi/design-system/pull/1943 is merged
        background: 'alternative100',
        color: 'alternative600',
      },
    },
    locales: {
      label: formatMessage({ id: 'widget.key-statistics.list.locales' }),
      icon: {
        file: <Earth />,
        background: 'success100',
        color: 'success600',
      },
    },
    admins: {
      label: formatMessage({ id: 'widget.key-statistics.list.admins' }),
      icon: {
        file: <User />,
        background: 'danger100',
        color: 'danger600',
      },
    },
    webhooks: {
      label: formatMessage({ id: 'widget.key-statistics.list.webhooks' }),
      icon: {
        file: <Alien />, // TODO: replace with a proper icon when https://github.com/strapi/design-system/pull/1943 is merged
        background: 'alternative100',
        color: 'alternative600',
      },
    },
    apiTokens: {
      label: formatMessage({ id: 'widget.key-statistics.list.apiTokens' }),
      icon: {
        file: <Key />,
        background: 'neutral100',
        color: 'neutral600',
      },
    },
  };

  const { draft, published, modified } = countDocuments ?? {
    draft: 0,
    published: 0,
    modified: 0,
  };

  const totalCountEntries = draft + published + modified;

  return (
    <Grid>
      {Object.entries({
        entries: totalCountEntries,
        ...countKeyStatistics,
      }).map(([key, value]) => (
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
