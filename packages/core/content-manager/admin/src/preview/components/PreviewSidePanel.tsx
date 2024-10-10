import * as React from 'react';

import { Button } from '@strapi/design-system';
import { UID } from '@strapi/types';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { useGetPreviewUrlQuery } from '../services/preview';

import type { PanelComponent } from '@strapi/content-manager/strapi-admin';

const PreviewSidePanel: PanelComponent = ({ model, documentId, document }) => {
  const { formatMessage } = useIntl();
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

  return {
    title: formatMessage({ id: 'content-manager.preview.panel.title', defaultMessage: 'Preview' }),
    content: (
      <Button variant="tertiary" fullWidth tag={Link} to={data.data.url} target="_blank">
        {formatMessage({
          id: 'content-manager.preview.panel.button',
          defaultMessage: 'Open preview',
        })}
      </Button>
    ),
  };
};

export { PreviewSidePanel };
