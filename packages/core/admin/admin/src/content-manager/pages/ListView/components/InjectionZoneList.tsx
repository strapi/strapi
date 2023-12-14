import { Box } from '@strapi/design-system';

import { InjectionZoneArea } from '../../../../components/InjectionZone';
import { useInjectionZone } from '../../../../hooks/useInjectionZone';

interface InjectionZoneListProps {
  area: InjectionZoneArea;
}

const InjectionZoneList = ({ area, ...props }: InjectionZoneListProps) => {
  const injectedComponents = useInjectionZone(area);

  if (!injectedComponents) {
    return null;
  }

  return (
    <ul>
      {injectedComponents.map(({ name, Component }) => (
        <Box key={name} padding={3} style={{ textAlign: 'center' }}>
          <Component {...props} />
        </Box>
      ))}
    </ul>
  );
};

export { InjectionZoneList };
export type { InjectionZoneListProps };
