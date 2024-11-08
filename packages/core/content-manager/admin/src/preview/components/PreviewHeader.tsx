import * as React from 'react';

import {
  useClipboard,
  useHistory,
  useNotification,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import { Flex, IconButton, Typography } from '@strapi/design-system';
import { Cross, Link as LinkIcon } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link, type To, useNavigate } from 'react-router-dom';

import { DocumentStatus } from '../../pages/EditView/components/DocumentStatus';
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
        <Status />
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
