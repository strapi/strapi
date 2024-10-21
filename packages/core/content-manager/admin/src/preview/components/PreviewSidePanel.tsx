import * as React from 'react';

import { useClipboard, useNotification, useTracking } from '@strapi/admin/strapi-admin';
import { Button, Flex, IconButton } from '@strapi/design-system';
import { Link as LinkIcon } from '@strapi/icons';
import { UID } from '@strapi/types';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { useGetPreviewUrlQuery } from '../services/preview';

import type { PanelComponent } from '@strapi/content-manager/strapi-admin';

const PreviewSidePanel: PanelComponent = ({ model, documentId, document }) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { copy } = useClipboard();
  const { trackUsage } = useTracking();
  const { data, error } = useGetPreviewUrlQuery({
    params: {
      contentType: model as UID.ContentType,
    },
    query: {
      documentId,
      locale: document?.locale,
      status: document?.status,
    },
  });

  if (!data?.data?.url || error) {
    return null;
  }

  const { url } = data.data;

  const handleCopyLink = () => {
    copy(url);
    toggleNotification({
      message: formatMessage({
        id: 'content-manager.preview.copy.success',
        defaultMessage: 'Copied preview link',
      }),
      type: 'success',
    });
  };

  const handleClick = () => {
    trackUsage('willOpenPreview');
  };

  return {
    title: formatMessage({ id: 'content-manager.preview.panel.title', defaultMessage: 'Preview' }),
    content: (
      <Flex gap={2} width="100%">
        <Button
          variant="tertiary"
          tag={Link}
          to={url}
          onClick={handleClick}
          target="_blank"
          flex="auto"
        >
          {formatMessage({
            id: 'content-manager.preview.panel.button',
            defaultMessage: 'Open preview',
          })}
        </Button>
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
    ),
  };
};

export { PreviewSidePanel };
