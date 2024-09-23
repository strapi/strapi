import * as React from 'react';

import { Box, Flex, Typography, TypographyProps, useCallbackRef } from '@strapi/design-system';

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
          paddingLeft={6}
          paddingRight={6}
          paddingTop={3}
          paddingBottom={3}
          position="fixed"
          top={0}
          right={0}
          background="neutral0"
          shadow="tableShadow"
          width={`${width}px`}
          zIndex={1}
          data-strapi-header-sticky
        >
          <Flex justifyContent="space-between">
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
        paddingLeft={10}
        paddingRight={10}
        paddingBottom={8}
        paddingTop={navigationAction ? 6 : 8}
        background="neutral100"
        data-strapi-header
      >
        {navigationAction ? <Box paddingBottom={2}>{navigationAction}</Box> : null}
        <Flex justifyContent="space-between">
          <Flex minWidth={0}>
            <Typography tag="h1" variant="alpha" {...props}>
              {title}
            </Typography>
            {secondaryAction ? <Box paddingLeft={4}>{secondaryAction}</Box> : null}
          </Flex>
          {primaryAction}
        </Flex>
        {isSubtitleString ? (
          <Typography variant="epsilon" textColor="neutral600" tag="p">
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

  const [containerRef, isVisible] = useElementOnScreen<HTMLDivElement>({
    root: null,
    rootMargin: '0px',
    threshold: 0,
  });

  useResizeObserver(containerRef, () => {
    if (containerRef.current) {
      setHeaderSize(containerRef.current.getBoundingClientRect());
    }
  });

  React.useEffect(() => {
    if (baseHeaderLayoutRef.current) {
      setHeaderSize(baseHeaderLayoutRef.current.getBoundingClientRect());
    }
  }, [baseHeaderLayoutRef]);

  return (
    <>
      <div style={{ height: headerSize?.height }} ref={containerRef}>
        {isVisible && <BaseHeaderLayout ref={baseHeaderLayoutRef} {...props} />}
      </div>

      {!isVisible && <BaseHeaderLayout {...props} sticky width={headerSize?.width} />}
    </>
  );
};

HeaderLayout.displayName = 'HeaderLayout';

/**
 * useElementOnScreen: hook that returns a ref to an element and a boolean indicating if the element is in the viewport.
 */
const useElementOnScreen = <TElement extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit
): [containerRef: React.RefObject<TElement>, isVisible: boolean] => {
  const containerRef = React.useRef<TElement>(null);

  const [isVisible, setIsVisible] = React.useState<boolean>(true);

  const callback: IntersectionObserverCallback = ([entry]) => {
    setIsVisible(entry.isIntersecting);
  };

  React.useEffect(() => {
    const containerEl = containerRef.current;
    const observer = new IntersectionObserver(callback, options);

    if (containerEl) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerEl) {
        observer.disconnect();
      }
    };
  }, [containerRef, options]);

  return [containerRef, isVisible];
};

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
