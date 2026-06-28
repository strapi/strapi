import * as React from 'react';

import type { InputRendererProps } from './InputRenderer';

type InputRendererComponent = React.ComponentType<InputRendererProps>;

const InputRendererContext = React.createContext<InputRendererComponent | null>(null);

const InputRendererProvider = ({
  renderer,
  children,
}: {
  renderer: InputRendererComponent;
  children: React.ReactNode;
}) => {
  return <InputRendererContext.Provider value={renderer}>{children}</InputRendererContext.Provider>;
};

const useInputRenderer = () => {
  const renderer = React.useContext(InputRendererContext);

  if (renderer === null) {
    throw new Error('useInputRenderer must be used within an InputRendererProvider');
  }

  return renderer;
};

export { InputRendererProvider, useInputRenderer };
