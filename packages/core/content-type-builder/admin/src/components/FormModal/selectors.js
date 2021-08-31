import { createSelector } from 'reselect';
import pluginId from '../../pluginId';
import { initialState } from './reducer';

/**
 * Direct selector to the formModal state domain
 */
const formModalDomain = () => state => state[`${pluginId}_formModal`] || initialState;

/**
 * Other specific selectors
 */

/**
 * Default selector used by formModal
 */

const makeSelectFormModal = () =>
  createSelector(formModalDomain(), substate => {
    return substate;
  });

export default makeSelectFormModal;
export { formModalDomain };
