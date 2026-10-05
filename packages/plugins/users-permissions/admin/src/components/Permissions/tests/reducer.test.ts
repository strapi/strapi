import { produce } from 'immer';
import { describe, it, expect, beforeEach } from 'vitest';

import { reducer, type State } from '../reducer';

describe('USERS PERMISSIONS | COMPONENTS | Permissions | reducer', () => {
  let state: State;

  beforeEach(() => {
    state = {
      collapses: [],
    };
  });

  describe('DEFAULT_ACTION', () => {
    it('should return the state', () => {
      const expected = state;

      // @ts-expect-error Exercise an unknown action at runtime.
      expect(reducer(state, {})).toEqual(expected);
    });
  });

  describe('TOGGLE_COLLAPSE', () => {
    it('should close the opened if the index matches', () => {
      state = {
        collapses: [
          { name: 'test1', isOpen: false },
          { name: 'test2', isOpen: true },
          { name: 'test3', isOpen: false },
        ],
      };

      const action = {
        type: 'TOGGLE_COLLAPSE' as const,
        index: 1,
      };

      const expected = produce(state, (draft) => {
        draft.collapses = [
          { name: 'test1', isOpen: false },
          { name: 'test2', isOpen: false },
          { name: 'test3', isOpen: false },
        ];
      });

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should close all the collapses and open the correct one', () => {
      state = {
        collapses: [
          { name: 'test1', isOpen: false },
          { name: 'test2', isOpen: true },
          { name: 'test3', isOpen: false },
        ],
      };

      const action = {
        type: 'TOGGLE_COLLAPSE' as const,
        index: 2,
      };

      const expected = produce(state, (draft) => {
        draft.collapses = [
          { name: 'test1', isOpen: false },
          { name: 'test2', isOpen: false },
          { name: 'test3', isOpen: true },
        ];
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
