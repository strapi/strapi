import * as React from 'react';

import {
  DescriptionComponentRenderer,
  useClipboard,
  useHistory,
  useNotification,
  useQueryParams,
  useStrapiApp,
} from '@strapi/admin/strapi-admin';
import { IconButton, Tabs, Typography, Grid, Flex } from '@strapi/design-system';
import { Cross, Link as LinkIcon } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link, type To } from 'react-router-dom';
import { styled } from 'styled-components';

import { DocumentActionButton } from '../../pages/EditView/components/DocumentActions';
import { DocumentStatus } from '../../pages/EditView/components/DocumentStatus';
import { getDocumentStatus } from '../../pages/EditView/EditViewPage';
import { usePreviewContext } from '../pages/Preview';

import type { ContentManagerPlugin, DocumentActionProps } from '../../content-manager';

/* -------------------------------------------------------------------------------------------------
 * ClosePreviewButton
 * -----------------------------------------------------------------------------------------------*/

const ClosePreviewButton = () => {
  const [{ query }] = useQueryParams<{
    plugins?: Record<string, unknown>;
  }>();
  const { formatMessage } = useIntl();

  const canGoBack = useHistory('BackButton', (state) => state.canGoBack);
  const goBack = useHistory('BackButton', (state) => state.goBack);
  const history = useHistory('BackButton', (state) => state.history);
  const locationIndex = useHistory('BackButton', (state) => state.currentLocationIndex);

  /**
   * Get the link destination from the history.
   * Rely on a fallback (the parent edit view page) if there's no page to go back .
   */
  const historyTo = canGoBack ? history.at(locationIndex - 2) : undefined;
  const fallback = {
    pathname: '..',
    search: stringify(query, { encode: false }),
  } satisfies To;
  const toWithFallback = historyTo ?? fallback;

  const handleClick = (e: React.MouseEvent) => {
    if (canGoBack) {
      // Prevent normal link behavior, go back in the history stack instead
      e.preventDefault();
      goBack();
      return;
    }

    // Otherwise rely on native link behavior to go back to the edit view. We don't use navigate()
    // here in order to get the relative="path" functionality from the Link component.
  };

  return (
    <IconButton
      variant="ghost"
      tag={Link}
      relative="path"
      to={toWithFallback}
      onClick={handleClick}
      label={formatMessage({
        id: 'content-manager.preview.header.close',
        defaultMessage: 'Close preview',
      })}
    >
      <Cross />
    </IconButton>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Status
 * -----------------------------------------------------------------------------------------------*/

const Status = () => {
  // Get status
  const document = usePreviewContext('PreviewHeader', (state) => state.document);
  const schema = usePreviewContext('PreviewHeader', (state) => state.schema);
  const meta = usePreviewContext('PreviewHeader', (state) => state.meta);
  const hasDraftAndPublished = schema?.options?.draftAndPublish ?? false;

  if (!hasDraftAndPublished) {
    return null;
  }

  const status = getDocumentStatus(document, meta);

  return <DocumentStatus status={status} size="XS" />;
};

const PreviewTabs = () => {
  const { formatMessage } = useIntl();

  // URL query params
  const [{ query }, setQuery] = useQueryParams<{ status: 'draft' | 'published' }>();

  // Get status
  const document = usePreviewContext('PreviewHeader', (state) => state.document);
  const schema = usePreviewContext('PreviewHeader', (state) => state.schema);
  const meta = usePreviewContext('PreviewHeader', (state) => state.meta);
  const hasDraftAndPublish = schema?.options?.draftAndPublish ?? false;
  const documentStatus = getDocumentStatus(document, meta);

  const handleTabChange = (status: string) => {
    if (status === 'published' || status === 'draft') {
      setQuery({ status }, 'push', true);
    }
  };

  if (!hasDraftAndPublish) {
    return null;
  }

  return (
    <>
      <Tabs.Root variant="simple" value={query.status || 'draft'} onValueChange={handleTabChange}>
        <Tabs.List
          aria-label={formatMessage({
            id: 'preview.tabs.label',
            defaultMessage: 'Document status',
          })}
        >
          <StatusTab value="draft">
            {formatMessage({
              id: 'content-manager.containers.List.draft',
              defaultMessage: 'draft',
            })}
          </StatusTab>
          <StatusTab value="published" disabled={documentStatus === 'draft'}>
            {formatMessage({
              id: 'content-manager.containers.List.published',
              defaultMessage: 'published',
            })}
          </StatusTab>
        </Tabs.List>
      </Tabs.Root>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PreviewHeader
 * -----------------------------------------------------------------------------------------------*/

const UnstablePreviewHeader = () => {
  const title = usePreviewContext('PreviewHeader', (state) => state.title);
  const document = usePreviewContext('PreviewHeader', (state) => state.document);
  const schema = usePreviewContext('PreviewHeader', (state) => state.schema);
  const meta = usePreviewContext('PreviewHeader', (state) => state.meta);
  const plugins = useStrapiApp('PreviewHeader', (state) => state.plugins);

  const [{ query }] = useQueryParams<{
    status?: 'draft' | 'published';
  }>();
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { copy } = useClipboard();

  const handleCopyLink = () => {
    copy(window.location.href);
    toggleNotification({
      message: formatMessage({
        id: 'content-manager.preview.copy.success',
        defaultMessage: 'Copied preview link',
      }),
      type: 'success',
    });
  };

  const hasDraftAndPublish = schema.options?.draftAndPublish ?? false;
  const props = {
    activeTab: query.status ?? null,
    collectionType: schema.kind === 'collectionType' ? 'collection-types' : 'single-types',
    model: schema.uid,
    documentId: document.documentId,
    document,
    meta,
  } satisfies DocumentActionProps;

  return (
    <Flex height="48px" gap={4} background="neutral0" borderColor="neutral150" tag="header">
      {/* Title and status */}
      <TitleContainer height="100%" paddingLeft={2} paddingRight={4}>
        <ClosePreviewButton />
        <PreviewTitle
          tag="h1"
          title={title}
          maxWidth="200px"
          fontSize={2}
          paddingLeft={2}
          paddingRight={3}
          fontWeight={600}
        >
          {title}
        </PreviewTitle>
        <Status />
      </TitleContainer>

      {/* Tabs and actions */}
      <Flex
        flex={1}
        paddingRight={2}
        gap={2}
        justifyContent={hasDraftAndPublish ? 'space-between' : 'flex-end'}
      >
        <PreviewTabs />
        <Flex gap={2}>
          <IconButton
            type="button"
            label={formatMessage({
              id: 'preview.copy.label',
              defaultMessage: 'Copy preview link',
            })}
            onClick={handleCopyLink}
          >
            <LinkIcon />
          </IconButton>
          <DescriptionComponentRenderer
            props={props}
            descriptions={(
              plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
            ).getDocumentActions('preview')}
          >
            {(actions) => {
              const filteredActions = actions.filter((action) =>
                [action.position].flat().includes('preview')
              );
              const [primaryAction, secondaryAction] = filteredActions;

              if (!primaryAction && !secondaryAction) return null;

              // Both actions are available when draft and publish enabled
              if (primaryAction && secondaryAction) {
                return (
                  <>
                    {/* Save */}
                    <DocumentActionButton
                      {...secondaryAction}
                      variant={secondaryAction.variant || 'secondary'}
                    />
                    {/* Publish */}
                    <DocumentActionButton
                      {...primaryAction}
                      variant={primaryAction.variant || 'default'}
                    />
                  </>
                );
              }

              // Otherwise we just have the save action
              return (
                <DocumentActionButton
                  {...primaryAction}
                  variant={primaryAction.variant || 'secondary'}
                />
              );
            }}
          </DescriptionComponentRenderer>
        </Flex>
      </Flex>
    </Flex>
  );
};

const PreviewHeader = () => {
  // Get the document title
  const title = usePreviewContext('PreviewHeader', (state) => state.title);

  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { copy } = useClipboard();

  const handleCopyLink = () => {
    copy(window.location.href);
    toggleNotification({
      message: formatMessage({
        id: 'content-manager.preview.copy.success',
        defaultMessage: 'Copied preview link',
      }),
      type: 'success',
    });
  };

  return (
    <Grid.Root
      gap={3}
      gridCols={3}
      paddingLeft={2}
      paddingRight={2}
      background="neutral0"
      borderColor="neutral150"
      tag="header"
    >
      {/* Title and status */}
      <Grid.Item xs={1} paddingTop={2} paddingBottom={2} gap={3}>
        <ClosePreviewButton />
        <PreviewTitle tag="h1" fontWeight={600} fontSize={2} maxWidth="200px" title={title}>
          {title}
        </PreviewTitle>
        <Status />
      </Grid.Item>
      {/* Tabs */}
      <Grid.Item xs={1} marginBottom="-1px" alignItems="end" margin="auto">
        <PreviewTabs />
      </Grid.Item>
      {/* Copy link */}
      <Grid.Item xs={1} justifyContent="end" paddingTop={2} paddingBottom={2}>
        <IconButton
          type="button"
          label={formatMessage({
            id: 'preview.copy.label',
            defaultMessage: 'Copy preview link',
          })}
          onClick={handleCopyLink}
        >
          <LinkIcon />
        </IconButton>
      </Grid.Item>
    </Grid.Root>
  );
};

const PreviewTitle = styled(Typography)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatusTab = styled(Tabs.Trigger)`
  text-transform: uppercase;
`;

const TitleContainer = styled(Flex)`
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

export { PreviewHeader, UnstablePreviewHeader };
