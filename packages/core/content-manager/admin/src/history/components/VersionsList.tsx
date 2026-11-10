import * as React from 'react';

import { useQueryParams, useIsMobile } from '@strapi/admin/strapi-admin';
import { AccessibleIcon, Box, Flex, Status, Tooltip, Typography } from '@strapi/design-system';
import { Key, User } from '@strapi/icons';
import { stringify } from 'qs';
import { type MessageDescriptor, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';

import { ActionsDrawer, useActionsDrawer } from '../../components/ActionsDrawer';
import { RelativeTime } from '../../components/RelativeTime';
import { DocumentStatus } from '../../pages/EditView/components/DocumentStatus';
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
 * TruncatedName
 * -----------------------------------------------------------------------------------------------*/

const TruncatedName = ({
  name,
  isTooltipOpen,
  onTooltipOpenChange,
}: {
  name: string;
  isTooltipOpen?: boolean;
  onTooltipOpenChange?: (open: boolean) => void;
}) => {
  const nameRef = React.useRef<HTMLSpanElement | null>(null);
  const [isNameCut, setIsNameCut] = React.useState(false);

  const measureName = React.useCallback(() => {
    if (nameRef.current) {
      setIsNameCut(nameRef.current.scrollWidth > nameRef.current.clientWidth);
    }
  }, []);

  const attachName = React.useCallback(
    (node: HTMLSpanElement | null) => {
      nameRef.current = node;
      measureName();
    },
    [measureName]
  );

  React.useEffect(() => {
    if (isTooltipOpen) {
      measureName();
    }
  }, [isTooltipOpen, measureName]);

  return (
    <Tooltip
      side="bottom"
      label={isNameCut ? name : undefined}
      open={isTooltipOpen}
      onOpenChange={onTooltipOpenChange}
    >
      <Typography ref={attachName} tag="span" variant="pi" ellipsis onPointerEnter={measureName}>
        {name}
      </Typography>
    </Tooltip>
  );
};

/* -------------------------------------------------------------------------------------------------
 * VersionAuthorName
 * -----------------------------------------------------------------------------------------------*/

const AUTHOR_TYPE_ICONS: Record<HistoryVersions.HistoryVersionAuthorType, React.ElementType> = {
  person: User,
  token: Key,
};

const AUTHOR_TYPE_LABELS: Record<HistoryVersions.HistoryVersionAuthorType, MessageDescriptor> = {
  person: {
    id: 'content-manager.history.sidebar.version-card.author-type.person',
    defaultMessage: 'Person',
  },
  token: {
    id: 'content-manager.history.sidebar.version-card.author-type.token',
    defaultMessage: 'Token',
  },
};

const DELETED_AUTHOR_LABELS: Record<HistoryVersions.HistoryVersionAuthorType, MessageDescriptor> = {
  person: {
    id: 'content-manager.history.sidebar.version-card.deleted-author.person',
    defaultMessage: 'Deleted user',
  },
  token: {
    id: 'content-manager.history.sidebar.version-card.deleted-author.token',
    defaultMessage: 'Deleted token',
  },
};

const ItalicName = styled(Typography)`
  font-style: italic;
`;

const VersionDescription = styled(Typography)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[1]};
  white-space: nowrap;
`;

const VersionAuthorName = ({
  author,
  isNameTooltipOpen,
  onNameTooltipOpenChange,
}: {
  author: HistoryVersions.HistoryVersionAuthor;
  isNameTooltipOpen?: boolean;
  onNameTooltipOpenChange?: (open: boolean) => void;
}) => {
  const { formatMessage } = useIntl();
  const Icon = AUTHOR_TYPE_ICONS[author.type];

  return (
    <Flex tag="span" gap={1} minWidth={0}>
      <Flex tag="span" shrink={0}>
        <AccessibleIcon label={formatMessage(AUTHOR_TYPE_LABELS[author.type])}>
          <Icon />
        </AccessibleIcon>
      </Flex>
      {author.name ? (
        <TruncatedName
          name={author.name}
          isTooltipOpen={isNameTooltipOpen}
          onTooltipOpenChange={onNameTooltipOpenChange}
        />
      ) : (
        <ItalicName tag="span" variant="pi" textColor="neutral500">
          {formatMessage(DELETED_AUTHOR_LABELS[author.type])}
        </ItalicName>
      )}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * VersionAuthor
 * -----------------------------------------------------------------------------------------------*/

const VersionAuthor = ({
  version,
  isCurrent,
  isNameTooltipOpen,
  onNameTooltipOpenChange,
}: {
  version: HistoryVersions.HistoryVersionDataResponse;
  isCurrent: boolean;
  isNameTooltipOpen?: boolean;
  onNameTooltipOpenChange?: (open: boolean) => void;
}) => {
  const { formatMessage } = useIntl();

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
          author: version.author && (
            <VersionAuthorName
              author={version.author}
              isNameTooltipOpen={isNameTooltipOpen}
              onNameTooltipOpenChange={onNameTooltipOpenChange}
            />
          ),
          isAnonymous: !version.author,
          isCurrent,
          b: BlueText,
        }
      )}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * VersionSource
 * -----------------------------------------------------------------------------------------------*/

const SOURCE_LABELS: Record<HistoryVersions.HistoryVersionSource, MessageDescriptor> = {
  'admin-panel': {
    id: 'content-manager.history.sidebar.version-card.source.admin-panel',
    defaultMessage: 'Admin panel',
  },
  'admin-api': {
    id: 'content-manager.history.sidebar.version-card.source.admin-api',
    defaultMessage: 'Admin API',
  },
};

const VersionSource = ({ source }: { source: HistoryVersions.HistoryVersionSource }) => {
  const { formatMessage } = useIntl();

  return (
    <Status variant="neutral" size="XS">
      <Typography tag="span" variant="omega" fontWeight="bold">
        {formatMessage(SOURCE_LABELS[source])}
      </Typography>
    </Status>
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
  // The name is not focusable inside the card link, so keyboard focus on the card shows its tooltip.
  // A click also focuses the card: the pointer down tells it apart, like the Radix tooltip trigger.
  const [isNameTooltipOpen, setIsNameTooltipOpen] = React.useState(false);
  const isPointerDownRef = React.useRef(false);

  const handleClick = () => {
    setIsOpen?.(false);
  };

  const handlePointerDown = () => {
    isPointerDownRef.current = true;
  };

  const handleFocus = () => {
    setIsNameTooltipOpen(!isPointerDownRef.current);
    isPointerDownRef.current = false;
  };

  const handleBlur = () => {
    setIsNameTooltipOpen(false);
    isPointerDownRef.current = false;
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
      onPointerDown={handlePointerDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Flex direction="column" gap={1} alignItems="flex-start" maxWidth="100%">
        <Typography tag="h3" fontWeight="semiBold">
          {formatDate(version.createdAt, {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
        <VersionDescription tag="p" variant="pi" textColor="neutral600" maxWidth="100%">
          <VersionAuthor
            version={version}
            isCurrent={isCurrent}
            isNameTooltipOpen={isNameTooltipOpen}
            onNameTooltipOpenChange={setIsNameTooltipOpen}
          />
        </VersionDescription>
      </Flex>
      <Flex gap={2} wrap="wrap">
        {version.status && <DocumentStatus status={version.status} size="XS" />}
        <VersionSource source={version.source} />
      </Flex>
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
    </>
  );
};

export { VersionsList };
