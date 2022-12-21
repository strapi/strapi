import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { GridItem } from '@strapi/design-system/Grid';
import { Box } from '@strapi/design-system/Box';
import { useElementOnScreen } from '@strapi/design-system/helpers/useElementOnScreen';
import { useTheme } from 'styled-components';
import BoundRoute from '../BoundRoute';
import { useApiTokenPermissionsContext } from '../../../../../../../contexts/ApiTokenPermissions';

const ActionBoundRoutes = () => {
  const {
    value: { selectedAction, routes },
  } = useApiTokenPermissionsContext();
  const containerPaddingTopSpace = 6;
  const theme = useTheme();
  const { formatMessage } = useIntl();
  const [stickyElementSize, setStickyElementSize] = useState(null);
  const [stickyTopOffset, setStickyTopOffset] = useState(0);
  const [containerRef, isVisible] = useElementOnScreen({
    root: null,
    rootMargin: `-${stickyTopOffset}px`,
    threshold: 1.0,
  });

  useEffect(() => {
    // we need to catch scroll event until we get the sticky header height
    const handleScrollEvent = () => {
      const currentStickyHeader = document.querySelector('[data-strapi-header-sticky]');

      if (currentStickyHeader) {
        const paddingTopPx = Number(theme.spaces[containerPaddingTopSpace].replace('px', ''));

        setStickyTopOffset(currentStickyHeader.clientHeight + paddingTopPx);

        document.removeEventListener('scroll', handleScrollEvent);
      }
    };

    document.addEventListener('scroll', handleScrollEvent);

    return () => {
      document.removeEventListener('scroll', handleScrollEvent);
    };
  }, [theme.spaces]);

  useEffect(() => {
    if (!isVisible && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();

      setStickyElementSize({
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: stickyTopOffset,
      });
    }
  }, [isVisible, containerRef, stickyTopOffset]);

  const actionSection = selectedAction?.split('.')[0];

  const content = selectedAction ? (
    <Stack spacing={2}>
      {routes[actionSection]?.map((route) => {
        return route.config.auth?.scope?.includes(selectedAction) ||
          route.handler === selectedAction ? (
          <BoundRoute key={route.handler} route={route} />
        ) : null;
      })}
    </Stack>
  ) : (
    <Stack spacing={2}>
      <Typography variant="delta" as="h3">
        {formatMessage({
          id: 'Settings.apiTokens.createPage.permissions.header.title',
          defaultMessage: 'Advanced settings',
        })}
      </Typography>
      <Typography as="p" textColor="neutral600">
        {formatMessage({
          id: 'Settings.apiTokens.createPage.permissions.header.hint',
          defaultMessage:
            "Select the application's actions or the plugin's actions and click on the cog icon to display the bound route",
        })}
      </Typography>
    </Stack>
  );

  return (
    <GridItem
      col={5}
      background="neutral150"
      paddingTop={containerPaddingTopSpace}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
      style={{ minHeight: '100%' }}
    >
      <Box ref={containerRef}>{isVisible && content}</Box>

      {!isVisible && stickyElementSize && (
        <Box
          background="neutral150"
          style={{
            position: 'fixed',
            width: `${stickyElementSize.width}px`,
            height: `${stickyElementSize.height}px`,
            left: `${stickyElementSize.left}px`,
            top: `${stickyElementSize.top}px`,
          }}
        >
          {content}
        </Box>
      )}
    </GridItem>
  );
};

export default ActionBoundRoutes;
