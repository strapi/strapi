import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { Box, Flex, Typography } from '@strapi/design-system';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { RelativeTime } from '../../components/RelativeTime';
import { DocumentStatus } from '../../pages/EditView/components/DocumentStatus';
import { getDisplayName } from '../../utils/users';
import { useHistoryContext } from '../pages/History';

import type { HistoryVersions } from '../../../../shared/contracts';

/* -------------------------------------------------------------------------------------------------
 * BlueText
 * -----------------------------------------------------------------------------------------------*/

const BlueText = (children: React.ReactNode) => (
  <Typography textColor="primary600" variant="pi">
    {children}
  </Typography>
);

/* -------------------------------------------------------------------------------------------------
 * VersionCard
 * -----------------------------------------------------------------------------------------------*/

interface VersionCardProps {
  version: HistoryVersions.HistoryVersionDataResponse;
  isCurrent: boolean;
}

const VersionCard = ({ version, isCurrent }: VersionCardProps) => {
  const { formatDate, formatMessage } = useIntl();
  const [{ query }] = useQueryParams<{ id?: string }>();
  const isActive = query.id === version.id.toString();
  const author = version.createdBy && getDisplayName(version.createdBy);

  return (
    <Flex
      direction="column"
      alignItems="flex-start"
      gap={3}
      hasRadius
      borderWidth="1px"
      borderStyle="solid"
      borderColor={isActive ? 'primary600' : 'neutral200'}
      color="neutral800"
      padding={5}
      tag={Link}
      to={`?${stringify({ ...query, id: version.id })}`}
      style={{ textDecoration: 'none' }}
    >
      <Flex direction="column" gap={1} alignItems="flex-start">
        <Typography tag="h3" fontWeight="semiBold">
          {formatDate(version.createdAt, {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
        <Typography tag="p" variant="pi" textColor="neutral600">
          {formatMessage(
            {
              id: 'content-manager.history.sidebar.versionDescription',
              defaultMessage:
                '{distanceToNow}{isAnonymous, select, true {} other { by {author}}}{isCurrent, select, true { <b>(current)</b>} other {}}',
            },
            {
              distanceToNow: <RelativeTime timestamp={new Date(version.createdAt)} />,
              author,
              isAnonymous: !Boolean(version.createdBy),
              isCurrent,
              b: BlueText,
            }
          )}
        </Typography>
      </Flex>
      {version.status && <DocumentStatus status={version.status} size="XS" />}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PaginationButton
 * -----------------------------------------------------------------------------------------------*/

interface PaginationButtonProps {
  page: number;
  children: React.ReactNode;
}

const PaginationButton = ({ page, children }: PaginationButtonProps) => {
  const [{ query }] = useQueryParams<{ id?: string }>();

  // Remove the id from the pagination link, so that the history page can redirect
  // to the id of the first history version in the new page once it's loaded
  const { id: _id, ...queryRest } = query;

  return (
    <Link to={{ search: stringify({ ...queryRest, page }) }} style={{ textDecoration: 'none' }}>
      <Typography variant="omega" textColor="primary600">
        {children}
      </Typography>
    </Link>
  );
};

/* -------------------------------------------------------------------------------------------------
 * VersionsList
 * -----------------------------------------------------------------------------------------------*/

const VersionsList = () => {
  const { formatMessage } = useIntl();
  const { versions, page } = useHistoryContext('VersionsList', (state) => ({
    versions: state.versions,
    page: state.page,
  }));

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
      tag="aside"
    >
      <Flex
        direction="row"
        justifyContent="space-between"
        padding={4}
        borderColor="neutral200"
        borderWidth="0 0 1px"
        borderStyle="solid"
        tag="header"
      >
        <Typography tag="h2" variant="omega" fontWeight="semiBold">
          {formatMessage({
            id: 'content-manager.history.sidebar.title',
            defaultMessage: 'Versions',
          })}
        </Typography>
        <Box background="neutral150" hasRadius padding={1}>
          <Typography variant="sigma" textColor="neutral600">
            {versions.meta.pagination.total}
          </Typography>
        </Box>
      </Flex>
      <Box flex={1} overflow="auto">
        {versions.meta.pagination.page > 1 && (
          <Box paddingTop={4} textAlign="center">
            <PaginationButton page={page - 1}>
              {formatMessage({
                id: 'content-manager.history.sidebar.show-newer',
                defaultMessage: 'Show newer versions',
              })}
            </PaginationButton>
          </Box>
        )}
        <Flex direction="column" gap={3} padding={4} tag="ul" alignItems="stretch">
          {versions.data.map((version, index) => (
            <li
              key={version.id}
              aria-label={formatMessage({
                id: 'content-manager.history.sidebar.title.version-card.aria-label',
                defaultMessage: 'Version card',
              })}
            >
              <VersionCard version={version} isCurrent={page === 1 && index === 0} />
            </li>
          ))}
        </Flex>
        {versions.meta.pagination.page < versions.meta.pagination.pageCount && (
          <Box paddingBottom={4} textAlign="center">
            <PaginationButton page={page + 1}>
              {formatMessage({
                id: 'content-manager.history.sidebar.show-older',
                defaultMessage: 'Show older versions',
              })}
            </PaginationButton>
          </Box>
        )}
      </Box>
    </Flex>
  );
};

export { VersionsList };
