/*
*
* Shared OverlayBlocker actions
*
 */


import {
  DISABLE_GLOBAL_OVERLAY_BLOCKER,
  ENABLE_GLOBAL_OVERLAY_BLOCKER,
} from '../constants/overlayBlocker';

export function disableGlobalOverlayBlocker() {
  return {
    type: DISABLE_GLOBAL_OVERLAY_BLOCKER,
  };
}

export function enableGlobalOverlayBlocker() {
  return {
    type: ENABLE_GLOBAL_OVERLAY_BLOCKER,
  };
}
