import * as React from 'react';

import { useStrapiApp } from '../features/StrapiApp';

export type InjectionZoneProps<TComponent extends React.ComponentType> = {
  area:
    | 'contentManager.listView.actions'
    | 'contentManager.editView.informations'
    | 'contentManager.editView.right-links'
    // pluginName.page.position
    | `${string}.${string}.${string}`;
} & React.ComponentProps<TComponent>;

export const InjectionZone = <TComponent extends React.ComponentType>({
  area,
  ...props
}: InjectionZoneProps<TComponent>) => {
  const { getPlugin } = useStrapiApp();
  const [pluginName, page, position] = area.split('.');
  const plugin = getPlugin(pluginName);

  if (!plugin) {
    return null;
  }

  const components = plugin.getInjectedComponents(page, position);

  if (!components) {
    return null;
  }

  return components.map(({ name, Component }) => <Component key={name} {...props} />);
};
