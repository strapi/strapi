import * as React from 'react';

import { useQueryParams, useTracking } from '@strapi/admin/strapi-admin';
import { Button, Flex } from '@strapi/design-system';
import { UID } from '@strapi/types';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link, useLocation } from 'react-router-dom';

import { useGetPreviewUrlQuery } from '../services/preview';

import type { PanelComponent } from '@strapi/content-manager/strapi-admin';

const PreviewSidePanel: PanelComponent = ({ model, documentId, document }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();

  /**
   * The preview URL isn't used in this component, we just fetch it to know if preview is enabled
   * for the content type. If it's not, the panel is not displayed. If it is, we display a link to
   * /preview, and the URL will already be loaded in the RTK query cache.
   */
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

  const trackNavigation = () => {
    // Append /preview to the current URL
    const destinationPathname = pathname.replace(/\/$/, '') + '/preview';
    trackUsage('willNavigate', { from: pathname, to: destinationPathname });
  };

  return {
    title: formatMessage({ id: 'content-manager.preview.panel.title', defaultMessage: 'Preview' }),
    content: (
      <Flex gap={2} width="100%">
        <Button
          variant="tertiary"
          tag={Link}
          to={{ pathname: 'preview', search: stringify(query, { encode: false }) }}
          onClick={trackNavigation}
          flex="auto"
        >
          {formatMessage({
            id: 'content-manager.preview.panel.button',
            defaultMessage: 'Open preview',
          })}
        </Button>
      </Flex>
    ),
  };
};

export { PreviewSidePanel };
