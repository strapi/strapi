import {
  InjectionZoneArea,
  InjectionZoneBlock,
  InjectionZoneContainer,
  InjectionZoneModule,
} from '../components/InjectionZone';
import { useStrapiApp } from '../features/StrapiApp';

export const useInjectionZone = (area: InjectionZoneArea) => {
  const getAdminInjectedComponents = useStrapiApp(
    'useInjectioneZone',
    (state) => state.getAdminInjectedComponents
  );

  const [moduleName, page, position] = area.split('.') as [
    InjectionZoneModule,
    InjectionZoneContainer,
    InjectionZoneBlock
  ];

  return getAdminInjectedComponents(moduleName, page, position);
};
