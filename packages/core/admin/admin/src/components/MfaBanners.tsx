import { MfaNotices } from '../features/MfaNotices';

import { MfaGraceBanner } from './MfaGraceBanner';

/**
 * The two-factor messages at the top of the content column, in their fixed order: the grace
 * banner (an action the user must take) first, the security notice (events to review) stacked
 * under it. Both are inline in the layout's flow, so neither can cover the other. Keep them here
 * together: the notice was once a toast that floated over the banner.
 */
const MfaBanners = () => (
  <>
    <MfaGraceBanner />
    <MfaNotices />
  </>
);

export { MfaBanners };
