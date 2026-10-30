import * as React from 'react';

/* -------------------------------------------------------------------------------------------------
 * Store
 * -----------------------------------------------------------------------------------------------*/

interface ContextStore<Value> {
  get: () => Value;
  set: (value: Value) => void;
  subscribe: (listener: () => void) => () => void;
}

const createStore = <Value,>(initialValue: Value): ContextStore<Value> => {
  let value = initialValue;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set: (nextValue) => {
      if (Object.is(value, nextValue)) return;

      value = nextValue;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/**
 * Subscribes to a slice of the store. The selection is compared outside of React's render
 * (`useSyncExternalStore`), so a consumer whose selected value didn't change is not rendered
 * at all when the context value changes.
 */
const useStoreSelector = <Value, Selected>(
  store: ContextStore<Value>,
  selector: (value: Value) => Selected
): Selected => {
  const getSelection = React.useMemo(() => {
    let hasMemo = false;
    let memoValue: Value;
    let memoSelection: Selected;

    // `useSyncExternalStore` requires a cached result for an unchanged store value.
    return () => {
      const value = store.get();

      if (hasMemo && Object.is(value, memoValue)) {
        return memoSelection;
      }

      const selection = selector(value);
      hasMemo = true;
      memoValue = value;
      memoSelection = selection;

      return selection;
    };
  }, [store, selector]);

  return React.useSyncExternalStore(store.subscribe, getSelection, getSelection);
};

/* -------------------------------------------------------------------------------------------------
 * createContext
 * -----------------------------------------------------------------------------------------------*/

/**
 * @experimental
 * @description Create a context provider and a hook to consume the context.
 *
 * @warning this may be removed to the design-system instead of becoming stable.
 */
function createContext<ContextValueType extends object | null>(
  rootComponentName: string,
  defaultContext?: ContextValueType
) {
  const defaultStore = createStore<ContextValueType | undefined>(defaultContext);
  const Context = React.createContext<ContextStore<ContextValueType | undefined>>(defaultStore);

  const Provider = (props: ContextValueType & { children: React.ReactNode }) => {
    const { children, ...context } = props;
    // Only re-memoize when prop values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const value = React.useMemo(() => context, Object.values(context)) as ContextValueType;

    // The store keeps the same identity for the lifetime of the provider: consumers are
    // notified of value changes through their subscription instead of a context re-render.
    const [store] = React.useState(() => createStore<ContextValueType | undefined>(value));

    React.useLayoutEffect(() => {
      store.set(value);
    }, [store, value]);

    return <Context.Provider value={store}>{children}</Context.Provider>;
  };

  function useContext<Selected, ShouldThrow extends boolean = true>(
    consumerName: string,
    selector: (value: ContextValueType) => Selected,
    shouldThrowOnMissingContext?: ShouldThrow
  ) {
    const store = React.useContext(Context);

    return useStoreSelector(store, (ctx) => {
      // The context is available, return the selected value
      if (ctx) return selector(ctx);

      // The context is not available, either return undefined or throw an error
      if (shouldThrowOnMissingContext) {
        throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
      }

      return undefined;
    }) as ShouldThrow extends true ? Selected : Selected | undefined;
  }

  Provider.displayName = rootComponentName + 'Provider';

  return [Provider, useContext] as const;
}

export { createContext };
