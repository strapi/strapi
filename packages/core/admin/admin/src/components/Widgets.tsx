import { useAuth } from '@strapi/admin/strapi-admin';
import { Avatar, Badge, Box, Flex, Typography } from '@strapi/design-system';
import { Earth, Images, User, Key, Files, Layout, Graph, Webhooks } from '@strapi/icons';
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

const formatNumber = ({ locale, number }: { locale: string; number: number }) => {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
};

const KeyStatisticsWidget = () => {
  const { formatMessage, locale } = useIntl();
  const { data: countDocuments, isLoading: isLoadingCountDocuments } = useGetCountDocumentsQuery();
  const { data: countKeyStatistics, isLoading: isLoadingKeyStatistics } =
    useGetKeyStatisticsQuery();

  if (isLoadingKeyStatistics || isLoadingCountDocuments) {
    return <Widget.Loading />;
  }

  if (!countKeyStatistics || !countDocuments) {
    return <Widget.Error />;
  }

  const keyStatisticsList = {
    entries: {
      label: {
        key: 'widget.key-statistics.list.entries',
        defaultMessage: 'Entries',
      },
      icon: {
        component: <Files />,
        background: 'primary100',
        color: 'primary600',
      },
    },
    assets: {
      label: {
        key: 'widget.key-statistics.list.assets',
        defaultMessage: 'Assets',
      },
      icon: {
        component: <Images />,
        background: 'warning100',
        color: 'warning600',
      },
    },
    contentTypes: {
      label: {
        key: 'widget.key-statistics.list.contentTypes',
        defaultMessage: 'Content-Types',
      },
      icon: {
        component: <Layout />,
        background: 'secondary100',
        color: 'secondary600',
      },
    },
    components: {
      label: {
        key: 'widget.key-statistics.list.components',
        defaultMessage: 'Components',
      },
      icon: {
        component: <Graph />,
        background: 'alternative100',
        color: 'alternative600',
      },
    },
    locales: {
      label: {
        key: 'widget.key-statistics.list.locales',
        defaultMessage: 'Locales',
      },
      icon: {
        component: <Earth />,
        background: 'success100',
        color: 'success600',
      },
    },
    admins: {
      label: {
        key: 'widget.key-statistics.list.admins',
        defaultMessage: 'Admins',
      },
      icon: {
        component: <User />,
        background: 'danger100',
        color: 'danger600',
      },
    },
    webhooks: {
      label: {
        key: 'widget.key-statistics.list.webhooks',
        defaultMessage: 'Webhooks',
      },
      icon: {
        component: <Webhooks />,
        background: 'alternative100',
        color: 'alternative600',
      },
    },
    apiTokens: {
      label: {
        key: 'widget.key-statistics.list.apiTokens',
        defaultMessage: 'API Tokens',
      },
      icon: {
        component: <Key />,
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
      {Object.entries(keyStatisticsList).map(([key, item]) => {
        const value = countKeyStatistics?.[key as keyof typeof countKeyStatistics];
        return (
          value !== null && (
            <GridCell key={`key-statistics-${key}`} padding={3} data-testid={`stat-${key}`}>
              <Flex alignItems="center" gap={2}>
                <Flex
                  padding={2}
                  borderRadius={1}
                  background={item.icon.background}
                  color={item.icon.color}
                >
                  {item.icon.component}
                </Flex>
                <Flex direction="column" alignItems="flex-start">
                  <Typography variant="pi" fontWeight="bold" textColor="neutral500">
                    {formatMessage({
                      id: item.label.key,
                      defaultMessage: item.label.defaultMessage,
                    })}
                  </Typography>
                  <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                    {formatNumber({
                      locale,
                      number: key === 'entries' ? totalCountEntries : value,
                    })}
                  </Typography>
                </Flex>
              </Flex>
            </GridCell>
          )
        );
      })}
    </Grid>
  );
};

export { ProfileWidget, KeyStatisticsWidget };
