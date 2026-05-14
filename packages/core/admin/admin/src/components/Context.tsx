import * as React from 'react';

import * as ContextSelector from 'use-context-selector';

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
  const Context = ContextSelector.createContext<ContextValueType | undefined>(defaultContext);

  const Provider = (props: ContextValueType & { children: React.ReactNode }) => {
    const { children, ...context } = props;
    // Only re-memoize when prop values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const value = React.useMemo(() => context, Object.values(context)) as ContextValueType;

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  function useContext<Selected, ShouldThrow extends boolean = true>(
    consumerName: string,
    selector: (value: ContextValueType) => Selected,
    shouldThrowOnMissingContext?: ShouldThrow
  ) {
    return ContextSelector.useContextSelector(Context, (ctx) => {
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
