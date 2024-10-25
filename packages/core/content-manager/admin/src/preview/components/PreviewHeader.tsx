import * as React from 'react';

import {
  useClipboard,
  useHistory,
  useNotification,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import { Box, type BoxProps, Flex, IconButton, Typography } from '@strapi/design-system';
import { Cross, Link as LinkIcon } from '@strapi/icons';
import { stringify } from 'qs';
import { type MessageDescriptor, useIntl } from 'react-intl';
import { Link, type To, useNavigate } from 'react-router-dom';

import { getDocumentStatus } from '../../pages/EditView/EditViewPage';
import { usePreviewContext } from '../pages/Preview';

/* -------------------------------------------------------------------------------------------------
 * ClosePreviewButton
 * -----------------------------------------------------------------------------------------------*/

const ClosePreviewButton = () => {
  const [{ query }] = useQueryParams();
  const navigate = useNavigate();
  const { formatMessage } = useIntl();

  const canGoBack = useHistory('BackButton', (state) => state.canGoBack);
  const goBack = useHistory('BackButton', (state) => state.goBack);
  const history = useHistory('BackButton', (state) => state.history);

  const fallbackUrl: To = {
    pathname: '..',
    search: stringify(query, { encode: false }),
  };

  const handleClick = (e: React.MouseEvent) => {
    /**
     * Prevent normal link behavior. We only make it an achor for accessibility reasons.
     * The point of this logic is to act as the browser's back button when possible, and to fallback
     * to a link behavior to the edit view when no history is available.
     *  */
    e.preventDefault();

    if (canGoBack) {
      goBack();
    } else {
      navigate(fallbackUrl);
    }
  };

  return (
    <IconButton
      tag={Link}
      to={history.at(-1) ?? fallbackUrl}
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
    <Flex
      justifyContent="space-between"
      background="neutral0"
      padding={2}
      borderColor="neutral150"
      tag="header"
    >
      <Flex gap={3}>
        <ClosePreviewButton />
        <Typography tag="h1" fontWeight={600} fontSize={2}>
          {title}
        </Typography>
        <DocumentStatus />
      </Flex>
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
    </Flex>
  );
};

export { PreviewHeader };
