/*
 *
 * App actions
 *
 */

import {
  FREEZE_APP,
  UNFREEZE_APP,
} from './constants';

export function freezeApp() {
  return {
    type: FREEZE_APP,
  };
}

export function unfreezeApp() {
  return {
    type: UNFREEZE_APP,
  };
}
