import { useAuth, useTracking } from '@strapi/admin/strapi-admin';
import { Avatar, Badge, Box, Flex, Typography } from '@strapi/design-system';
import { Earth, Images, User, Key, Files, Layout, Graph, Webhooks } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
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

const LinkCell = styled(Link)`
  text-decoration: none;
  padding: ${({ theme }) => theme.spaces[3]};
`;

const KeyStatisticsWidget = () => {
  const { trackUsage } = useTracking();
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
        id: 'widget.key-statistics.list.entries',
        defaultMessage: 'Entries',
      },
      icon: {
        component: <Files />,
        background: 'primary100',
        color: 'primary600',
      },
      link: '/content-manager',
    },
    assets: {
      label: {
        id: 'widget.key-statistics.list.assets',
        defaultMessage: 'Assets',
      },
      icon: {
        component: <Images />,
        background: 'warning100',
        color: 'warning600',
      },
      link: '/plugins/upload',
    },
    contentTypes: {
      label: {
        id: 'widget.key-statistics.list.contentTypes',
        defaultMessage: 'Content-Types',
      },
      icon: {
        component: <Layout />,
        background: 'secondary100',
        color: 'secondary600',
      },
      link: '/plugins/content-type-builder',
    },
    components: {
      label: {
        id: 'widget.key-statistics.list.components',
        defaultMessage: 'Components',
      },
      icon: {
        component: <Graph />,
        background: 'alternative100',
        color: 'alternative600',
      },
      link: '/plugins/content-type-builder',
    },
    locales: {
      label: {
        id: 'widget.key-statistics.list.locales',
        defaultMessage: 'Locales',
      },
      icon: {
        component: <Earth />,
        background: 'success100',
        color: 'success600',
      },
      link: '/settings/internationalization',
    },
    admins: {
      label: {
        id: 'widget.key-statistics.list.admins',
        defaultMessage: 'Admins',
      },
      icon: {
        component: <User />,
        background: 'danger100',
        color: 'danger600',
      },
      link: '/settings/users?pageSize=10&page=1&sort=firstname',
    },
    webhooks: {
      label: {
        id: 'widget.key-statistics.list.webhooks',
        defaultMessage: 'Webhooks',
      },
      icon: {
        component: <Webhooks />,
        background: 'alternative100',
        color: 'alternative600',
      },
      link: '/settings/webhooks',
    },
    apiTokens: {
      label: {
        id: 'widget.key-statistics.list.apiTokens',
        defaultMessage: 'API Tokens',
      },
      icon: {
        component: <Key />,
        background: 'neutral100',
        color: 'neutral600',
      },
      link: '/settings/api-tokens?sort=name:ASC',
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
            <GridCell
              as={LinkCell}
              to={item.link}
              key={`key-statistics-${key}`}
              data-testid={`stat-${key}`}
              onClick={() => trackUsage('didOpenKeyStatisticsWidgetLink', { itemKey: key })}
            >
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
                    {formatMessage(item.label)}
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
