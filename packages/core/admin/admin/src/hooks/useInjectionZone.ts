import { useStrapiApp } from '@strapi/helper-plugin';

import {
  InjectionZoneArea,
  InjectionZoneBlock,
  InjectionZoneContainer,
  InjectionZoneModule,
} from '../components/InjectionZone';

export const useInjectionZone = (area: InjectionZoneArea) => {
  const { getAdminInjectedComponents } = useStrapiApp();

  const [moduleName, page, position] = area.split('.') as [
    InjectionZoneModule,
    InjectionZoneContainer,
    InjectionZoneBlock
  ];

  return getAdminInjectedComponents(moduleName, page, position);
};
