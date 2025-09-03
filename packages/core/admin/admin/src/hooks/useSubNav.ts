import * as React from 'react';

/* -------------------------------------------------------------------------------------------------
 * useSubNav
 * -----------------------------------------------------------------------------------------------*/

export const useSubNav = () => {
  const closeSideNav = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('closeMobileNavigation'));
  }, []);

  return {
    closeSideNav,
  };
};
