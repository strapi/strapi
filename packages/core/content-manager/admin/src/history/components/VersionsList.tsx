import * as React from 'react';

import { useQueryParams, useIsMobile } from '@strapi/admin/strapi-admin';
import { Box, Flex, Typography } from '@strapi/design-system';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { ActionsDrawer, useActionsDrawer } from '../../components/ActionsDrawer';
import { RelativeTime } from '../../components/RelativeTime';
import { DocumentStatus } from '../../pages/EditView/components/DocumentStatus';
import { getDisplayName } from '../../utils/users';
import { HistoryContextValue, useHistoryContext } from '../pages/History';

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
 * VersionAuthor
 * -----------------------------------------------------------------------------------------------*/

const VersionAuthor = ({
  version,
  isCurrent,
}: {
  version: HistoryVersions.HistoryVersionDataResponse;
  isCurrent: boolean;
}) => {
  const { formatMessage } = useIntl();
  const author = version.createdBy && getDisplayName(version.createdBy);
  return (
    <>
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
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * VersionCard
 * -----------------------------------------------------------------------------------------------*/

interface VersionCardProps {
  version: HistoryVersions.HistoryVersionDataResponse;
  isCurrent: boolean;
}

const VersionCard = ({ version, isCurrent }: VersionCardProps) => {
  const { formatDate } = useIntl();
  const [{ query }] = useQueryParams<{ id?: string }>();
  const setIsOpen = useActionsDrawer('VersionCard', (s) => s?.setIsOpen, false);
  const isActive = query.id === version.id.toString();

  const handleClick = () => {
    setIsOpen?.(false);
  };

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
      onClick={handleClick}
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
          <VersionAuthor version={version} isCurrent={isCurrent} />
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
 * VersionsListItems
 * -----------------------------------------------------------------------------------------------*/

const VersionsListItems = () => {
  const { formatMessage } = useIntl();
  const { versions, page } = useHistoryContext('VersionsListItems', (state) => ({
    versions: state.versions,
    page: state.page,
  }));

  return (
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
      <Flex
        direction="column"
        gap={3}
        padding={{ initial: 0, medium: 4 }}
        tag="ul"
        alignItems="stretch"
      >
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
  const isMobile = useIsMobile();

  const [{ query }] = useQueryParams<{ id?: string }>();
  const currentVersion = versions.data.find((version) => version.id.toString() === query.id);

  return !isMobile ? (
    <Flex
      shrink={0}
      direction="column"
      alignItems="stretch"
      width={{ initial: '28rem', large: '32rem' }}
      height="100%"
      overflow="hidden"
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
        role="banner"
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
      <VersionsListItems />
    </Flex>
  ) : (
    <>
      <ActionsDrawer.Root hasContent hasSideNav>
        <ActionsDrawer.Overlay />
        <ActionsDrawer.Header>
          {currentVersion && (
            <Flex gap={2} overflow="hidden">
              <Box flex={1} overflow="hidden">
                <Typography
                  display="block"
                  variant="omega"
                  textColor="neutral600"
                  overflow="hidden"
                  style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  <VersionAuthor
                    version={currentVersion}
                    isCurrent={page === 1 && versions.data.indexOf(currentVersion) === 0}
                  />
                </Typography>
              </Box>
              {currentVersion.status && <DocumentStatus status={currentVersion.status} size="XS" />}
            </Flex>
          )}
        </ActionsDrawer.Header>
        <ActionsDrawer.Content>
          <VersionsListItems />
        </ActionsDrawer.Content>
      </ActionsDrawer.Root>
      {/* Adding a fixed height to the bottom of the page to prevent 
      the actions drawer from covering the content
      (32px + 12px * 2 padding + 1px border) */}
      <Box width="100%" height="5.7rem" />
    </>
  );
};

export { VersionsList };
