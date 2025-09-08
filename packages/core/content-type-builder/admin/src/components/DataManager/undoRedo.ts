import {
  CaseReducer,
  createSlice,
  CreateSliceOptions,
  Draft,
  original,
  PayloadAction,
  SliceCaseReducers,
} from '@reduxjs/toolkit';

export type UndoRedoState<T> = {
  past: Array<Partial<T>>;
  future: Array<Partial<T>>;
  current: T;
};

type WrappedUndoRedoReducer<TState, TReducers extends SliceCaseReducers<TState>> = {
  [K in keyof TReducers]: TReducers[K] extends CaseReducer<TState, infer A>
    ? CaseReducer<UndoRedoState<TState>, A>
    : never;
};

type UndoRedoReducer<TState, TReducers extends SliceCaseReducers<TState>> = WrappedUndoRedoReducer<
  TState,
  TReducers
> & {
  undo: CaseReducer<UndoRedoState<TState>>;
  redo: CaseReducer<UndoRedoState<TState>>;
  discardAll: CaseReducer<UndoRedoState<TState>>;
  clearHistory: CaseReducer<UndoRedoState<TState>>;
};

type Opts<TState> = {
  limit?: number;
  excludeActionsFromHistory?: string[];
  stateSelector?: (state: Draft<TState> | undefined) => Draft<Partial<TState>>;
  discard?: (state: Draft<TState>) => void;
};

const isCallable = (obj: unknown): obj is (...args: unknown[]) => unknown => {
  return typeof obj === 'function';
};

export const createUndoRedoSlice = <State, CaseReducers extends SliceCaseReducers<State>>(
  sliceOpts: CreateSliceOptions<State, CaseReducers, string>,
  opts: Opts<State>
) => {
  const initialState: UndoRedoState<State> = {
    past: [],
    future: [],
    current: isCallable(sliceOpts.initialState) ? sliceOpts.initialState() : sliceOpts.initialState,
  };

  const { limit = 10 } = opts ?? {};

  const selector = opts.stateSelector || (<T>(state: Draft<T>): Draft<T> => state);

  const wrappedReducers = Object.keys(sliceOpts.reducers).reduce(
    (acc, actionName: string) => {
      const reducer = sliceOpts.reducers[actionName];

      if (!isCallable(reducer)) {
        throw new Error('Reducer must be a function. prepapre not support in UndoRedo wrapper');
      }

      acc[actionName] = (state, action) => {
        const newCurrent = reducer(state.current as Draft<State>, action);

        if (opts.excludeActionsFromHistory?.includes(actionName)) {
          if (newCurrent !== undefined) {
            state.current = newCurrent as Draft<State>;
          }

          return;
        }

        const originalCurrent = original(state.current);

        state.past.push(selector(originalCurrent)!);
        if (state.past.length > limit) {
          state.past.shift();
        }
        state.future = [];

        if (newCurrent !== undefined) {
          state.current = newCurrent as Draft<State>;
        }
      };

      return acc;
    },
    {} as Record<string, CaseReducer<UndoRedoState<State>, PayloadAction<unknown>>>
  ) as WrappedUndoRedoReducer<State, CaseReducers>;

  return createSlice<UndoRedoState<State>, UndoRedoReducer<State, CaseReducers>>({
    name: sliceOpts.name,
    initialState,
    // @ts-expect-error - TS doesn't like the fact that we're adding extra reducers
    reducers: {
      ...wrappedReducers,
      undo: (state) => {
        if (state.past.length === 0) {
          return;
        }

        const previous = state.past.pop();

        if (previous !== undefined) {
          state.future = [state.current, ...state.future];
          // reapply the previous state partially
          // @ts-expect-error - TS doesn't like the fact that we're mutating the state
          state.current = { ...state.current, ...previous };
        }
      },

      redo: (state) => {
        if (state.future.length === 0) {
          return;
        }

        const next = state.future.shift();
        if (next != undefined) {
          state.past = [...state.past, state.current];
          // reapply the previous state partially
          // @ts-expect-error - TS doesn't like the fact that we're mutating the state
          state.current = { ...state.current, ...next };
        }
      },

      discardAll: (state) => {
        if (opts.discard) {
          opts.discard(state.current);
        } else {
          // @ts-expect-error - TS doesn't like the fact that we're mutating the state
          state.current = initialState.current;
        }
        state.past = [];
        state.future = [];
      },

      clearHistory: (state) => {
        state.past = [];
        state.future = [];
      },
    },
  });
};
