import * as React from 'react';

import { useClipboard, useNotification, useQueryParams } from '@strapi/admin/strapi-admin';
import {
  Box,
  type BoxProps,
  Flex,
  IconButton,
  Tabs,
  Typography,
  Grid,
} from '@strapi/design-system';
import { Cross, Link as LinkIcon } from '@strapi/icons';
import { stringify } from 'qs';
import { type MessageDescriptor, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';

import { getDocumentStatus } from '../../pages/EditView/EditViewPage';
import { usePreviewContext } from '../pages/Preview';

/* -------------------------------------------------------------------------------------------------
 * ClosePreviewButton
 * -----------------------------------------------------------------------------------------------*/

const ClosePreviewButton = () => {
  const [{ query }] = useQueryParams<{
    plugins?: Record<string, unknown>;
  }>();
  const { formatMessage } = useIntl();

  return (
    <IconButton
      tag={Link}
      relative="path"
      to={{
        pathname: '..',
        search: stringify({ plugins: query.plugins }, { encode: false }),
      }}
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
 * DocumentStatus
 * -----------------------------------------------------------------------------------------------*/

interface StatusData {
  background: BoxProps['background'];
  border: BoxProps['borderColor'];
  text: BoxProps['color'];
  message: MessageDescriptor;
}

const getStatusData = (status: ReturnType<typeof getDocumentStatus>): StatusData => {
  switch (status) {
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

const DocumentStatus = () => {
  const { formatMessage } = useIntl();

  // Get status
  const document = usePreviewContext('PreviewHeader', (state) => state.document);
  const schema = usePreviewContext('PreviewHeader', (state) => state.schema);
  const meta = usePreviewContext('PreviewHeader', (state) => state.meta);
  const hasDraftAndPublished = schema?.options?.draftAndPublish ?? false;
  const status = getDocumentStatus(document, meta);

  const statusData = getStatusData(status);

  if (!hasDraftAndPublished) {
    return null;
  }

  /**
   * TODO: Add an XS size to the Status component from the design system so that we can add
   * a variant to the VersionsList component.
   * Then we could reuse it both here and in history's VersionCard component.
   */

  return (
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
  );
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
    <Flex margin="auto">
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
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PreviewHeader
 * -----------------------------------------------------------------------------------------------*/

const PreviewHeader = () => {
  // Get main field
  const mainField = usePreviewContext('PreviewHeader', (state) => state.mainField);
  const document = usePreviewContext('PreviewHeader', (state) => state.document);
  const title = document[mainField];

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
        <Typography tag="h1" fontWeight={600} fontSize={2} maxWidth={'200px'}>
          {title}
        </Typography>
        <DocumentStatus />
      </Grid.Item>
      {/* Tabs */}
      {/* <Grid.Item xs={1}> */}
      <Grid.Item xs={1} style={{ alignSelf: 'end' }}>
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

const StatusTab = styled(Tabs.Trigger)`
  text-transform: uppercase;
`;

export { PreviewHeader };
