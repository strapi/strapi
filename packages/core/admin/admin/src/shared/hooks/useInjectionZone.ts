import { useAdmin } from '../../contexts/admin';
import {
  InjectionZoneArea,
  InjectionZoneBlock,
  InjectionZoneContainer,
  InjectionZoneModule,
} from '../components/InjectionZone';

export const useInjectionZone = (area: InjectionZoneArea) => {
  const { getAdminInjectedComponents } = useAdmin();

  const [moduleName, page, position] = area.split('.') as [
    InjectionZoneModule,
    InjectionZoneContainer,
    InjectionZoneBlock
  ];

  return getAdminInjectedComponents(moduleName, page, position);
};
