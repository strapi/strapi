import * as React from 'react';

import { Flex } from '@strapi/design-system';

import { GLOBAL_BANNERS_HEIGHT_VAR } from '../constants/theme';
import { MfaNotices } from '../features/MfaNotices';
import { isMfaFeatureEnabled } from '../utils/mfaFeature';

import { MfaGraceBanner } from './MfaGraceBanner';

/**
 * Publishes the stack's rendered height as `GLOBAL_BANNERS_HEIGHT_VAR` on the root element, so
 * whatever is positioned against the viewport top (toasts, the sticky page header, the mobile menu)
 * can sit below the banners instead of over them. `0px` while both banners are hidden; removed on
 * unmount, where every reader falls back to `0px`.
 */
const useGlobalBannersHeight = (ref: React.RefObject<HTMLElement>) => {
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const root = document.documentElement;
    const publish = () => {
      root.style.setProperty(GLOBAL_BANNERS_HEIGHT_VAR, `${element.offsetHeight}px`);
    };
    publish();

    if (typeof ResizeObserver === 'undefined') {
      return () => root.style.removeProperty(GLOBAL_BANNERS_HEIGHT_VAR);
    }
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(GLOBAL_BANNERS_HEIGHT_VAR);
    };
  }, [ref]);
};

const MfaBannerStack = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  useGlobalBannersHeight(ref);

  return (
    <Flex ref={ref} direction="column" alignItems="stretch" shrink={0} data-testid="mfa-banners">
      <MfaGraceBanner />
      <MfaNotices />
    </Flex>
  );
};

/**
 * The global two-factor banners, rendered by the authenticated layout above all navigation, edge to
 * edge, in their fixed order: the grace banner (an action the user must take) first, the security
 * notice (events to review) under it. Both are in the layout's flow, so neither can cover the
 * other, and toasts offset by the stack's height (`GLOBAL_BANNERS_HEIGHT`). Nothing renders, and
 * nothing is requested, in a build without the feature.
 */
const MfaBanners = () => (isMfaFeatureEnabled() ? <MfaBannerStack /> : null);

export { MfaBanners };
