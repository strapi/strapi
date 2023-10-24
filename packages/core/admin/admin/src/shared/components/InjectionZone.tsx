import { InjectionZoneArea, useInjectionZone } from '../hooks/useInjectionZone';

export const InjectionZone = ({ area, ...props }: { area: InjectionZoneArea }) => {
  const components = useInjectionZone(area);

  return components.map((component) => <component.Component key={component.name} {...props} />);
};
