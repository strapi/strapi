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

import { DocumentStatus } from '../../pages/EditView/components/DocumentStatus';
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
        <Typography tag="h1" fontWeight={600} fontSize={2} maxWidth="200px">
          {title}
        </Typography>
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

const StatusTab = styled(Tabs.Trigger)`
  text-transform: uppercase;
`;

export { PreviewHeader };
