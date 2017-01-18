/**
 * The home state selectors
 */

import { createSelector } from 'reselect';

const selectName = () => createSelector(
  (state) => state.get('name')
);


export {
  selectName,
};
