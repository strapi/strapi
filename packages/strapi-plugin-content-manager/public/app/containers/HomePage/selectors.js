/**
 * The home state selectors
 */

import { createSelector } from 'reselect';

const selectHome = (state) => state.get('home');

const selectName = () => createSelector(
  selectHome,
  (state) => {
    return state.get('name');
  }
);

export {
  selectHome,
  selectName,
};
