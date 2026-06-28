import * as React from 'react';

import type { ListProps } from './listTypes';

type ListRenderer = React.ComponentType<ListProps>;

const ListRendererContext = React.createContext<ListRenderer | null>(null);

const ListRendererProvider = ({
  renderer,
  children,
}: {
  renderer: ListRenderer;
  children: React.ReactNode;
}) => {
  return <ListRendererContext.Provider value={renderer}>{children}</ListRendererContext.Provider>;
};

const useListRenderer = () => {
  const renderer = React.useContext(ListRendererContext);

  if (renderer === null) {
    throw new Error('useListRenderer must be used within a ListRendererProvider');
  }

  return renderer;
};

export { ListRendererProvider, useListRenderer };
