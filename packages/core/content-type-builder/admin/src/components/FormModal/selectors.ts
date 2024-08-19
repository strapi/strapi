import { createSelector } from '@reduxjs/toolkit';

import { pluginId } from '../../pluginId';

import { initialState } from './reducer';

/**
 * Direct selector to the formModal state domain
 */
const formModalDomain = () => (state: any) => state[`${pluginId}_formModal`] || initialState;

/**
 * Other specific selectors
 */

/**
 * Default selector used by formModal
 */

export const makeSelectFormModal = () =>
  createSelector(formModalDomain(), (substate) => {
    return substate;
  });

export { formModalDomain };
