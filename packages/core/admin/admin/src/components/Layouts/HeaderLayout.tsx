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

import { useTracking } from '../../features/Tracking';
import { useElementOnScreen } from '../../hooks/useElementOnScreen';

import { getMatchingDocLink } from './utils/getMatchingDocLink';

/* -------------------------------------------------------------------------------------------------
 * BaseHeaderLayout
 * -----------------------------------------------------------------------------------------------*/

interface DocLink {
  link: string;
  title: string;
  pathname: string;
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
    const isSubtitleString = typeof subtitle === 'string';

    const { formatMessage } = useIntl();
    const { trackUsage } = useTracking();

    const docLinkButton = docLink ? (
      <Flex>
        <IconButton
          onClick={() =>
            trackUsage('didClickOnDocLink', { from: docLink.pathname, to: docLink.link })
          }
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
      </Flex>
    ) : null;

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
          <Flex gap={2} justifyContent="space-between">
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
                <Flex>
                  {docLinkButton}
                  {primaryAction}
                </Flex>
              ) : undefined}
            </Flex>
          </Flex>
        </Box>
      );
    }

    console.log(primaryAction ? true : false);
    
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
        <Flex gap={2} justifyContent="space-between">
          <Flex minWidth={0}>
            <Typography tag="h1" variant="alpha" {...props}>
              {title}
            </Typography>
            {secondaryAction ? <Box paddingLeft={4}>{secondaryAction}</Box> : null}
          </Flex>
          {/* Experiment */}
          <Flex>
            {docLinkButton}
            {primaryAction}
          </Flex>
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
  const [isVisible, setIsVisible] = React.useState(true);
  const { pathname } = useLocation();
  const docLink = getMatchingDocLink(pathname);

  const containerRef = useElementOnScreen<HTMLDivElement>(setIsVisible, {
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
        {isVisible && <BaseHeaderLayout ref={baseHeaderLayoutRef} {...props} docLink={docLink} />}
      </div>

      {!isVisible && (
        <BaseHeaderLayout {...props} sticky width={headerSize?.width} docLink={docLink} />
      )}
    </>
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
