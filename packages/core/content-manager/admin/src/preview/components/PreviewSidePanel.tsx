import * as React from 'react';

import { useQueryParams, useTracking, useForm } from '@strapi/admin/strapi-admin';
import { Box, Button, Tooltip, type TooltipProps } from '@strapi/design-system';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link, useLocation } from 'react-router-dom';

import { useGetPreviewUrlQuery } from '../services/preview';

import type { PanelComponent } from '@strapi/content-manager/strapi-admin';
import type { UID } from '@strapi/types';

interface ConditionalTooltipProps {
  isShown: boolean;
  label: TooltipProps['label'];
  children: React.ReactNode;
}

const ConditionalTooltip = ({ isShown, label, children }: ConditionalTooltipProps) => {
  if (isShown) {
    return <Tooltip label={label}>{children}</Tooltip>;
  }

  return children;
};

const PreviewSidePanel: PanelComponent = ({ model, documentId, document }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();
  const isModified = useForm('PreviewSidePanel', (state) => state.modified);

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
      <ConditionalTooltip
        label={formatMessage({
          id: 'content-manager.preview.panel.button-disabled-tooltip',
          defaultMessage: 'Please save to open the preview',
        })}
        isShown={isModified}
      >
        <Box cursor="not-allowed" width="100%">
          <Button
            variant="tertiary"
            tag={Link}
            to={{ pathname: 'preview', search: stringify(query, { encode: false }) }}
            onClick={trackNavigation}
            width="100%"
            disabled={isModified}
            pointerEvents={isModified ? 'none' : undefined}
            tabIndex={isModified ? -1 : undefined}
          >
            {formatMessage({
              id: 'content-manager.preview.panel.button',
              defaultMessage: 'Open preview',
            })}
          </Button>
        </Box>
      </ConditionalTooltip>
    ),
  };
};

export { PreviewSidePanel };
