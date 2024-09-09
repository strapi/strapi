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

  const useContext = <Selected,>(
    consumerName: string,
    selector: (value: ContextValueType) => Selected
  ): Selected =>
    ContextSelector.useContextSelector(Context, (ctx) => {
      if (ctx) return selector(ctx);
      // it's a required context.
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    });

  Provider.displayName = rootComponentName + 'Provider';

  return [Provider, useContext] as const;
}

export { createContext };
