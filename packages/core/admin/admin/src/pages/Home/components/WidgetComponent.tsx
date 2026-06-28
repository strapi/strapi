import * as React from 'react';

import { Widget } from '../../../components/WidgetHelpers';

/* -------------------------------------------------------------------------------------------------
 * WidgetComponent
 * -----------------------------------------------------------------------------------------------*/

export const WidgetComponent = ({
  component,
  columnWidth,
}: {
  component: () => Promise<React.ComponentType>;
  columnWidth: number;
}) => {
  const [loadedComponent, setLoadedComponent] = React.useState<React.ComponentType<{
    columnWidth?: number;
  }> | null>(null);

  React.useEffect(() => {
    const loadComponent = async () => {
      const resolvedComponent = await component();

      setLoadedComponent(() => resolvedComponent);
    };

    loadComponent();
  }, [component]);

  const Component = loadedComponent;

  if (Component === null) {
    return <Widget.Loading />;
  }

  return <Component {...({ columnWidth } as Record<string, unknown>)} />;
};
