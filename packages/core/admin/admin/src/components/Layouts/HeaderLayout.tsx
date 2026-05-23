import * as React from 'react';

import {
  Box,
  Flex,
  Typography,
  TypographyProps,
  useCallbackRef,
  IconButton,
} from '@strapi/design-system';
import { Question } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation, Link } from 'react-router-dom';

import {
  HEIGHT_TOP_NAVIGATION,
  HEIGHT_TOP_NAVIGATION_MEDIUM,
  RESPONSIVE_DEFAULT_SPACING,
} from '../../constants/theme';
import { useTracking } from '../../features/Tracking';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useElementOnScreen } from '../../hooks/useElementOnScreen';
import { useIsMobile } from '../../hooks/useMediaQuery';

import { getMatchingDocLink } from './utils/getMatchingDocLink';

/* -------------------------------------------------------------------------------------------------
 * BaseHeaderLayout
 * -----------------------------------------------------------------------------------------------*/

interface DocLink {
  link: string;
  title: string;
  path: string;
}

interface BaseHeaderLayoutProps extends Omit<TypographyProps<'div'>, 'tag'> {
  navigationAction?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  subtitle?: React.ReactNode;
  sticky?: boolean;
  width?: number;
  docLink?: DocLink | null;
}

const BaseHeaderLayout = React.forwardRef<HTMLDivElement, BaseHeaderLayoutProps>(
  (
    {
      navigationAction,
      primaryAction,
      secondaryAction,
      subtitle,
      title,
      sticky,
      width,
      docLink,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile();
    const isSubtitleString = typeof subtitle === 'string';

    const { formatMessage } = useIntl();
    const { trackUsage } = useTracking();

    const docLinkButton = docLink ? (
      <IconButton
        onClick={() => trackUsage('didClickOnDocLink', { from: docLink.path, to: docLink.link })}
        size="S"
        label={formatMessage({
          id: 'app.HeaderLayout.docLink.label',
          defaultMessage: 'Learn more on our documentation',
        })}
        to={docLink.link}
        tag={Link}
        target="_blank"
      >
        <Question />
      </IconButton>
    ) : null;

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
          minHeight={{
            initial: HEIGHT_TOP_NAVIGATION,
            medium: HEIGHT_TOP_NAVIGATION_MEDIUM,
          }}
          data-strapi-header-sticky
        >
          <Flex alignItems="center" justifyContent="space-between" wrap="wrap" width="100%" gap={2}>
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
            <Flex>
              {primaryAction ? (
                <Flex gap={2}>
                  {docLinkButton}
                  {primaryAction}
                </Flex>
              ) : undefined}
            </Flex>
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
        <Flex direction="column" alignItems="initial" gap={3}>
          {navigationAction}
          {!isMobile ? (
            <>
              <Flex justifyContent="space-between" wrap="wrap" gap={4}>
                <Flex minWidth={0}>
                  <Typography
                    tag="h1"
                    variant="alpha"
                    {...props}
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%',
                    }}
                  >
                    {title}
                  </Typography>
                  {secondaryAction && <Box paddingLeft={4}>{secondaryAction}</Box>}
                </Flex>
                <Box paddingLeft={4} marginLeft="auto">
                  <Flex gap={2}>
                    {docLinkButton}
                    {primaryAction}
                  </Flex>
                </Box>
              </Flex>
              {isSubtitleString ? (
                <Typography variant="epsilon" textColor="neutral600" tag="p">
                  {subtitle}
                </Typography>
              ) : (
                subtitle
              )}
            </>
          ) : (
            <>
              <Typography
                tag="h1"
                variant="alpha"
                {...props}
                style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  maxWidth: '100%',
                }}
              >
                {title}
              </Typography>
              {isSubtitleString ? (
                <Typography variant="epsilon" textColor="neutral600" tag="p">
                  {subtitle}
                </Typography>
              ) : (
                subtitle
              )}
              {(primaryAction || secondaryAction) && (
                <Flex gap={3}>
                  {secondaryAction}
                  {docLinkButton}
                  {primaryAction}
                </Flex>
              )}
            </>
          )}
        </Flex>
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
  const location = useLocation();
  const docLink = React.useMemo(() => {
    if (window.strapi.flags.docLinks === false) return null;
    return getMatchingDocLink(location.pathname);
  }, [location]);

  const containerRef = useElementOnScreen<HTMLDivElement>(setIsVisible, {
    root: null,
    rootMargin: '0px',
    threshold: 0,
  });

  useResizeObserver([containerRef, baseHeaderLayoutRef], () => {
    const headerContainer = baseHeaderLayoutRef.current ?? containerRef.current;

    if (headerContainer) {
      const newSize = headerContainer.getBoundingClientRect();

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
    if (baseHeaderLayoutRef.current || containerRef.current) {
      const headerContainer = baseHeaderLayoutRef.current ?? containerRef.current;
      setHeaderSize(headerContainer?.getBoundingClientRect() ?? null);
    }
  }, [containerRef]);

  if (deviceType === 'mobile') {
    return <BaseHeaderLayout {...props} docLink={docLink} />;
  }

  return (
    <div ref={containerRef}>
      <div style={{ height: headerSize?.height }}>
        {isVisible && <BaseHeaderLayout ref={baseHeaderLayoutRef} {...props} docLink={docLink} />}
      </div>

      {!isVisible && (
        <BaseHeaderLayout {...props} sticky width={headerSize?.width} docLink={docLink} />
      )}
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
