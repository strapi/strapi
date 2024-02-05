import * as React from 'react';

import { Box, Flex, Typography, type BoxProps } from '@strapi/design-system';
import { useQueryParams } from '@strapi/helper-plugin';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { formatDistanceToNowStrict } from 'date-fns';
import * as locales from 'date-fns/locale';
import { stringify } from 'qs';
import { type MessageDescriptor, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { getDateFnsLocaleName } from '../../../utils/locales';
import { getDisplayName } from '../../utils/users';

/* -------------------------------------------------------------------------------------------------
 * BlueText
 * -----------------------------------------------------------------------------------------------*/

const BlueText = (children: React.ReactNode) => (
  <Typography textColor="primary600">{children}</Typography>
);

/* -------------------------------------------------------------------------------------------------
 * VersionCard
 * -----------------------------------------------------------------------------------------------*/

interface StatusData {
  background: BoxProps['background'];
  border: BoxProps['borderColor'];
  text: BoxProps['color'];
  message: MessageDescriptor;
}

interface VersionCardProps {
  version: Contracts.HistoryVersions.GetHistoryVersions.Response['data'][number];
  isCurrent: boolean;
}

const VersionCard = ({ version, isCurrent }: VersionCardProps) => {
  const { formatDate, formatMessage, locale } = useIntl();
  const [{ query }] = useQueryParams<{ id?: string }>();

  const statusData = ((): StatusData => {
    switch (version.status) {
      case 'draft':
        return {
          background: 'secondary100',
          border: 'secondary200',
          text: 'secondary700',
          message: {
            id: 'content-manager.containers.List.draft',
            defaultMessage: 'Draft',
          },
        };
      case 'modified':
        return {
          background: 'alternative100',
          border: 'alternative200',
          text: 'alternative700',
          message: {
            // TODO: check the translation key once D&P v5 is done
            id: 'content-manager.containers.List.modified',
            defaultMessage: 'Modified',
          },
        };
      case 'published':
      default:
        return {
          background: 'success100',
          border: 'success200',
          text: 'success700',
          message: {
            id: 'content-manager.containers.List.published',
            defaultMessage: 'Published',
          },
        };
    }
  })();
  const isActive = query.id === version.id.toString();
  const distanceToNow = formatDistanceToNowStrict(new Date(version.createdAt), {
    addSuffix: true,
    locale: locales[getDateFnsLocaleName(locale)],
  });
  const author = version.createdBy && getDisplayName(version.createdBy, formatMessage);

  return (
    <Flex
      direction="column"
      alignItems="flex-start"
      gap={3}
      hasRadius
      borderWidth="1px"
      borderStyle="solid"
      borderColor={isActive ? 'primary600' : 'neutral200'}
      paddingTop={5}
      paddingBottom={5}
      paddingLeft={5}
      paddingRight={5}
      as={Link}
      to={`?${stringify({ ...query, id: version.id })}`}
      style={{ textDecoration: 'none' }}
    >
      <Flex direction="column" gap={1} alignItems="flex-start">
        <Typography as="h3" fontWeight="semiBold">
          {formatDate(version.createdAt, {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
        <Typography as="p" textColor="neutral600">
          {formatMessage(
            {
              id: 'content-manager.history.sidebar.versionDescription',
              defaultMessage:
                '{distanceToNow}{isAnonymous, select, true {} other { by {author}}}{isCurrent, select, true { <b>(current)</b>} other {}}',
            },
            {
              distanceToNow,
              author,
              isAnonymous: !Boolean(version.createdBy),
              isCurrent,
              b: BlueText,
            }
          )}
        </Typography>
      </Flex>
      {version.status && (
        <Box
          background={statusData.background}
          borderStyle="solid"
          borderWidth="1px"
          borderColor={statusData.border}
          hasRadius
          paddingLeft="6px"
          paddingRight="6px"
          paddingTop="2px"
          paddingBottom="2px"
        >
          <Typography variant="pi" fontWeight="bold" textColor={statusData.text}>
            {formatMessage(statusData.message)}
          </Typography>
        </Box>
      )}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * VersionsList
 * -----------------------------------------------------------------------------------------------*/

interface VersionsListProps {
  versions: Contracts.HistoryVersions.GetHistoryVersions.Response;
  page: number;
}

const VersionsList = ({ versions, page }: VersionsListProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex
      shrink={0}
      direction="column"
      alignItems="stretch"
      width="320px"
      height="100vh"
      background="neutral0"
      borderColor="neutral200"
      borderWidth="0 0 0 1px"
      borderStyle="solid"
      as="aside"
    >
      <Flex
        direction="row"
        justifyContent="space-between"
        padding={4}
        borderColor="neutral200"
        borderWidth="0 0 1px"
        borderStyle="solid"
        as="header"
      >
        <Typography as="h2" variant="omega" fontWeight="semiBold">
          {formatMessage({
            id: 'content-manager.history.sidebar.title',
            defaultMessage: 'Versions',
          })}
        </Typography>
        <Box background="neutral150" hasRadius padding={1}>
          <Typography variant="sigma" textColor="neutral600">
            {versions.meta.pagination?.total}
          </Typography>
        </Box>
      </Flex>
      <Flex
        direction="column"
        gap={4}
        paddingTop={4}
        paddingLeft={4}
        paddingRight={4}
        paddingBottom={4}
        as="ul"
        alignItems="stretch"
        flex={1}
        overflow="scroll"
      >
        {versions.data.map((version, index) => (
          <li key={version.id}>
            <VersionCard version={version} isCurrent={page === 1 && index === 0} />
          </li>
        ))}
      </Flex>
    </Flex>
  );
};

export { VersionsList };
