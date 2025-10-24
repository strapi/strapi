import * as React from 'react';

import { Box, Flex, Typography, TypographyProps, useCallbackRef } from '@strapi/design-system';

import { HEIGHT_TOP_NAVIGATION, RESPONSIVE_DEFAULT_SPACING } from '../../constants/theme';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useElementOnScreen } from '../../hooks/useElementOnScreen';

/* -------------------------------------------------------------------------------------------------
 * BaseHeaderLayout
 * -----------------------------------------------------------------------------------------------*/

interface BaseHeaderLayoutProps extends Omit<TypographyProps<'div'>, 'tag'> {
  navigationAction?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  subtitle?: React.ReactNode;
  sticky?: boolean;
  width?: number;
}

const BaseHeaderLayout = React.forwardRef<HTMLDivElement, BaseHeaderLayoutProps>(
  (
    { navigationAction, primaryAction, secondaryAction, subtitle, title, sticky, width, ...props },
    ref
  ) => {
    const isSubtitleString = typeof subtitle === 'string';

    if (sticky) {
      return (
        <Box
          display="flex"
          paddingLeft={6}
          paddingRight={6}
          paddingTop={2}
          paddingBottom={2}
          position="fixed"
          top={0}
          background="neutral0"
          shadow="tableShadow"
          width={`${width}px`}
          zIndex={2}
          minHeight={HEIGHT_TOP_NAVIGATION}
          data-strapi-header-sticky
        >
          <Flex alignItems="center" justifyContent="space-between" wrap="wrap" width="100%">
            <Flex>
              {navigationAction && <Box paddingRight={3}>{navigationAction}</Box>}
              <Box>
                <Typography variant="beta" tag="h1" {...props}>
                  {title}
                </Typography>
                {isSubtitleString ? (
                  <Typography variant="pi" textColor="neutral600">
                    {subtitle}
                  </Typography>
                ) : (
                  subtitle
                )}
              </Box>
              {secondaryAction ? <Box paddingLeft={4}>{secondaryAction}</Box> : null}
            </Flex>
            <Flex>{primaryAction ? <Box paddingLeft={2}>{primaryAction}</Box> : undefined}</Flex>
          </Flex>
        </Box>
      );
    }

    return (
      <Box
        ref={ref}
        paddingLeft={RESPONSIVE_DEFAULT_SPACING}
        paddingRight={RESPONSIVE_DEFAULT_SPACING}
        paddingBottom={{
          initial: 4,
          large: 8,
        }}
        paddingTop={{
          initial: 4,
          large: navigationAction ? 6 : 8,
        }}
        background="neutral100"
        data-strapi-header
      >
        <Flex direction="column" alignItems="initial" gap={2}>
          {navigationAction}
          <Flex justifyContent="space-between" wrap="wrap" gap={4}>
            <Flex minWidth={0}>
              <Typography tag="h1" variant="alpha" {...props}>
                {title}
              </Typography>
              {secondaryAction ? <Box paddingLeft={4}>{secondaryAction}</Box> : null}
            </Flex>
            {primaryAction}
          </Flex>
        </Flex>
        {isSubtitleString ? (
          <Typography
            variant="epsilon"
            textColor="neutral600"
            tag="p"
            paddingTop={{ initial: 4, large: 0 }}
          >
            {subtitle}
          </Typography>
        ) : (
          subtitle
        )}
      </Box>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * HeaderLayout
 * -----------------------------------------------------------------------------------------------*/

interface HeaderLayoutProps extends BaseHeaderLayoutProps {}

const HeaderLayout = (props: HeaderLayoutProps) => {
  const baseHeaderLayoutRef = React.useRef<HTMLDivElement>(null);
  const [headerSize, setHeaderSize] = React.useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = React.useState(true);
  const deviceType = useDeviceType();

  const containerRef = useElementOnScreen<HTMLDivElement>(setIsVisible, {
    root: null,
    rootMargin: '0px',
    threshold: 0,
  });

  useResizeObserver([containerRef], () => {
    if (containerRef.current) {
      const newSize = containerRef.current.getBoundingClientRect();
      setHeaderSize((prevSize) => {
        // Only update if size actually changed
        if (!prevSize || prevSize.height !== newSize.height || prevSize.width !== newSize.width) {
          return newSize;
        }
        return prevSize;
      });
    }
  });

  React.useEffect(() => {
    if (containerRef.current) {
      setHeaderSize(containerRef.current.getBoundingClientRect());
    }
  }, [containerRef]);

  if (deviceType === 'mobile') {
    return <BaseHeaderLayout {...props} />;
  }

  return (
    <div ref={containerRef}>
      <div style={{ height: headerSize?.height }}>
        {isVisible && <BaseHeaderLayout ref={baseHeaderLayoutRef} {...props} />}
      </div>

      {!isVisible && <BaseHeaderLayout {...props} sticky width={headerSize?.width} />}
    </div>
  );
};

HeaderLayout.displayName = 'HeaderLayout';

/**
 * useResizeObserver: hook that observes the size of an element and calls a callback when it changes.
 */
const useResizeObserver = (
  sources: React.RefObject<HTMLElement> | React.RefObject<HTMLElement>[],
  onResize: ResizeObserverCallback
) => {
  const handleResize = useCallbackRef(onResize);

  React.useLayoutEffect(() => {
    const resizeObs = new ResizeObserver(handleResize);

    if (Array.isArray(sources)) {
      sources.forEach((source) => {
        if (source.current) {
          resizeObs.observe(source.current);
        }
      });
    } else if (sources.current) {
      resizeObs.observe(sources.current);
    }

    return () => {
      resizeObs.disconnect();
    };
  }, [sources, handleResize]);
};

export type { HeaderLayoutProps, BaseHeaderLayoutProps };
export { HeaderLayout, BaseHeaderLayout };
