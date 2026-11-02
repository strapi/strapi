import * as React from 'react';

import { useMatch } from 'react-router-dom';

import { MediaLibraryBanner } from './MediaLibraryBanner';
import { UpsellBanner } from './UpsellBanner';

/**
 * @description Renders the admin's top banners, ensuring only one shows at a time instead of
 * stacking: the Media Library banner takes priority over the upsell one. Kept as its own
 * component (rather than inline in `AuthenticatedLayout`) so this wiring can be unit tested
 * without the rest of the layout's unrelated dependencies (menu, tracking, app info, etc.).
 */
const TopBanners = () => {
  // Seeded from the current route so `UpsellBanner` (and its trial-license query) doesn't
  // mount-then-immediately-unmount on first render when landing directly on the Media Library.
  // `MediaLibraryBanner`'s own `onVisibilityChange` corrects this afterwards if it turns out
  // dismissed, same as it does for any other visibility change.
  const isOnMediaLibraryRoute = useMatch('/plugins/upload/*') !== null;
  const [isMediaLibraryBannerVisible, setIsMediaLibraryBannerVisible] =
    React.useState(isOnMediaLibraryRoute);

  return (
    <>
      {!isMediaLibraryBannerVisible && <UpsellBanner />}
      <MediaLibraryBanner onVisibilityChange={setIsMediaLibraryBannerVisible} />
    </>
  );
};

export { TopBanners };
