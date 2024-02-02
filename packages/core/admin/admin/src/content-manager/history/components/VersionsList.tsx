import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { LoadingIndicatorPage, useQueryParams } from '@strapi/helper-plugin';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { formatDistanceToNowStrict } from 'date-fns';
import * as locales from 'date-fns/locale';
import { stringify } from 'qs';
import { type MessageDescriptor, useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';

import { buildValidGetParams } from '../../utils/api';
import { useGetHistoryVersionsQuery } from '../services/historyVersion';

import type { Entity, UID } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * BlueChunks
 * -----------------------------------------------------------------------------------------------*/

const BlueChunks = (chunks: React.ReactNode) => (
  <Typography textColor="primary600">{chunks}</Typography>
);

/* -------------------------------------------------------------------------------------------------
 * VersionCard
 * -----------------------------------------------------------------------------------------------*/

type Color = React.ComponentProps<typeof Box>['color'];

interface StatusData {
  background: Color;
  border: Color;
  text: Color;
  message: MessageDescriptor;
}

interface VersionCardProps {
  version: Contracts.HistoryVersions.GetHistoryVersions.Response['data'][number];
  isCurrent: boolean;
}

const VersionCard = ({ version, isCurrent }: VersionCardProps) => {
  const { formatDate, formatMessage, locale } = useIntl();
  const [{ query }] = useQueryParams<{ id?: string }>();

  const isActive = query.id === version.id.toString();

  const getStatusData = (): StatusData => {
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
  };

  const statusData = getStatusData();

  const distanceToNow = formatDistanceToNowStrict(new Date(version.createdAt), {
    addSuffix: true,
    locale: locales[locale as keyof typeof locales],
  });

  const author =
    version.createdBy?.username || `${version.createdBy?.firstname} ${version.createdBy?.lastname}`;

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
              id: 'todo',
              defaultMessage:
                '{distanceToNow}{isAnonymous, select, true {} other { by {author}}}{isCurrent, select, true { <b>(current)</b>} other {}}',
            },
            {
              distanceToNow,
              author,
              isAnonymous: version.createdBy ? 'false' : 'true',
              isCurrent: isCurrent ? 'true' : 'false',
              b: BlueChunks,
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
  contentType: UID.ContentType;
  documentId?: Entity.ID;
}

const VersionsList = ({ contentType, documentId }: VersionsListProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  // Parse state from query params
  const [{ query }] = useQueryParams<{
    page?: number;
    id?: number;
    plugins?: Record<string, unknown>;
  }>();
  const validQueryParams = buildValidGetParams(query);
  const page = validQueryParams.page ? Number(validQueryParams.page) : 1;

  const response = useGetHistoryVersionsQuery({
    contentType,
    ...(documentId ? { documentId } : {}),
    ...validQueryParams,
  });

  // Make sure the user lands on a selected history version
  React.useEffect(() => {
    const versions = response.data?.data;

    if (!response.isLoading && !query.id && versions?.[0]) {
      navigate({ search: stringify({ ...query, id: versions[0].id }) }, { replace: true });
    }
  }, [response.isLoading, navigate, query.id, response.data?.data, query]);

  if (response.isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Flex
      direction="column"
      alignItems="stretch"
      width="320px"
      minHeight="100vh"
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
            {response.data?.meta.pagination?.total}
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
        {response.data?.data.map((version, index) => (
          <li key={version.id}>
            <VersionCard version={version} isCurrent={page === 1 && index === 0} />
          </li>
        ))}
      </Flex>
    </Flex>
  );
};

export { VersionsList };
