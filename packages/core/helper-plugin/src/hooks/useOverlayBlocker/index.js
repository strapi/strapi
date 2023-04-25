/**
 *
 * useOverlayBlocker
 *
 */

import { useContext, useRef } from 'react';
import OverlayBlockerContext from '../../contexts/OverlayBlockerContext';

const useOverlayBlocker = () => {
  const { lockApp, unlockApp } = useContext(OverlayBlockerContext);
  // Use a ref so we can safely add the components or the fields
  // to a hook dependencies array
  const lockAppRef = useRef(lockApp);
  const unlockAppRef = useRef(unlockApp);

  return { lockApp: lockAppRef.current, unlockApp: unlockAppRef.current };
};

export default useOverlayBlocker;
