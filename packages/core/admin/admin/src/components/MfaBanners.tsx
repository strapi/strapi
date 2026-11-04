import { MfaNotices } from '../features/MfaNotices';
import { isMfaFeatureEnabled } from '../utils/mfaFeature';

import { MfaGraceBanner } from './MfaGraceBanner';

/**
 * The two-factor messages at the top of the content column, in their fixed order: the grace
 * banner (an action the user must take) first, the security notice (events to review) stacked
 * under it. Both are inline in the layout's flow, so neither can cover the other. Keep them here
 * together. Nothing renders, and nothing is requested, in a build without the feature.
 */
const MfaBanners = () =>
  isMfaFeatureEnabled() ? (
    <>
      <MfaGraceBanner />
      <MfaNotices />
    </>
  ) : null;

export { MfaBanners };
