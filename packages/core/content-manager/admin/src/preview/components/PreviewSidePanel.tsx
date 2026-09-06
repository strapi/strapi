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

/**
 * Always keeps the Tooltip (and therefore the children subtree) mounted: conditionally wrapping
 * would remount the child button whenever `isShown` flips, and a click landing during that swap
 * is silently lost. When the tooltip must not show, it is force-closed via the controlled `open`
 * prop instead of being removed from the tree.
 */
const ConditionalTooltip = ({ isShown, label, children }: ConditionalTooltipProps) => {
  return (
    <Tooltip label={label} open={isShown ? undefined : false}>
      {children}
    </Tooltip>
  );
};

const PreviewSidePanel: PanelComponent = ({ model, documentId, document }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();
  const isModified = useForm('PreviewSidePanel', (state) => state.modified);
  const isUnsaved = Boolean(!document || !document.id);

  const title = formatMessage({
    id: 'content-manager.preview.panel.title',
    defaultMessage: 'Preview',
  });

  /**
   * The preview URL isn't used in this component, we just fetch it to know if preview is enabled
   * for the content type. If it's not, the panel is not displayed. If it is, we display a link to
   * /preview, and the URL will already be loaded in the RTK query cache.
   */
  const { data, error } = useGetPreviewUrlQuery(
    {
      params: {
        contentType: model as UID.ContentType,
      },
      query: {
        documentId,
        locale: document?.locale,
        status: document?.status,
      },
    },
    // Don't bother making the request since we won't show any UI
    { skip: isUnsaved }
  );

  /**
   * The query args above change while the document settles (locale/status resolve after load and
   * on save/publish), and each change is a new cache entry with transiently empty data. Latch
   * enablement once a URL has been seen so the "Open preview" button doesn't unmount and remount
   * mid-interaction — a click landing during such a swap is silently lost.
   */
  const [isPreviewEnabled, setIsPreviewEnabled] = React.useState(false);
  const previewUrl = data?.data?.url;
  React.useEffect(() => {
    if (previewUrl) {
      setIsPreviewEnabled(true);
    }
  }, [previewUrl]);

  if (isUnsaved) {
    return null;
  }

  // Preview was not configured but not disabled either (otherwise it would be a success 204).
  // So we encourage the user to set it up.
  if (error && error.name === 'NotFoundError') {
    return {
      title,
      content: (
        <Button
          variant="tertiary"
          tag={Link}
          to="https://docs.strapi.io/cms/features/preview"
          target="_blank"
          rel="noopener noreferrer"
          width="100%"
        >
          {formatMessage({
            id: 'content-manager.preview.panel.button-configuration',
            defaultMessage: 'Set up preview',
          })}
        </Button>
      ),
    };
  }

  if (!isPreviewEnabled && (!data?.data?.url || error)) {
    return null;
  }

  const trackNavigation = () => {
    // Append /preview to the current URL
    const destinationPathname = pathname.replace(/\/$/, '') + '/preview';
    trackUsage('willNavigate', { from: pathname, to: destinationPathname });
  };

  return {
    title,
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
