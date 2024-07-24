import { createSelector } from '@reduxjs/toolkit';

import { pluginId } from '../../pluginId';

import { initialState } from './reducer';

import type { DataManagerStateType } from '../../types';

/**
 * Direct selector to the dataManagerProvider state domain
 */
const dataManagerProviderDomain = () => (state: DataManagerStateType) =>
  state[`${pluginId}_dataManagerProvider`] || initialState;

/**
 * Other specific selectors
 */

/**
 * Default selector used by dataManagerProvider
 */

const makeSelectDataManagerProvider = () =>
  createSelector(dataManagerProviderDomain(), (substate) => {
    return substate;
  });

export { makeSelectDataManagerProvider, dataManagerProviderDomain };
