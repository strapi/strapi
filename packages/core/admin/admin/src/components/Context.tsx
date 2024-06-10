import * as React from 'react';

function createContext<ContextValueType extends object | null>(
  rootComponentName: string,
  defaultContext?: ContextValueType
) {
  const Context = React.createContext<ContextValueType | undefined>(defaultContext);

  const Provider = (props: ContextValueType & { children: React.ReactNode }) => {
    const { children, ...context } = props;
    // Only re-memoize when prop values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const value = React.useMemo(() => context, Object.values(context)) as ContextValueType;
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const useContext = (consumerName: string) => {
    const ctx = React.useContext(Context);
    if (!ctx) {
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    return ctx;
  };

  Provider.displayName = rootComponentName + 'Provider';

  return [Provider, useContext] as const;
}

export { createContext };
