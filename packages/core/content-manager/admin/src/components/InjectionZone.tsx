import { useStrapiApp, InjectionZoneComponent } from '@strapi/admin/strapi-admin';

const INJECTION_ZONES = {
  editView: { informations: [], 'right-links': [] },
  listView: {
    actions: [],
    deleteModalAdditionalInfos: [],
    publishModalAdditionalInfos: [],
    unpublishModalAdditionalInfos: [],
  },
} satisfies InjectionZones;

interface InjectionZones {
  editView: {
    informations: InjectionZoneComponent[];
    'right-links': InjectionZoneComponent[];
  };
  listView: {
    actions: InjectionZoneComponent[];
    deleteModalAdditionalInfos: InjectionZoneComponent[];
    publishModalAdditionalInfos: InjectionZoneComponent[];
    unpublishModalAdditionalInfos: InjectionZoneComponent[];
  };
}

type InjectionZoneArea =
  | 'editView.informations'
  | 'editView.right-links'
  | 'listView.actions'
  | 'listView.unpublishModalAdditionalInfos'
  | 'listView.deleteModalAdditionalInfos'
  | 'listView.publishModalAdditionalInfos'
  | 'listView.deleteModalAdditionalInfos';

type InjectionZoneModule = InjectionZoneArea extends `${infer Word}.${string}` ? Word : never;
type InjectionZoneContainer = InjectionZoneArea extends `${string}.${infer Word}.${string}`
  ? Word
  : never;
type InjectionZoneBlock = InjectionZoneArea extends `${string}.${string}.${infer Word}`
  ? Word
  : never;

/**
 * You can't know what this component props will be because it's generic and used everywhere
 * e.g. content-manager edit view, we just send the slug but we might not in the listView,
 * therefore, people should type it themselves on the components they render.
 */
const InjectionZone = ({ area, ...props }: { area: InjectionZoneArea; [key: string]: unknown }) => {
  const components = useInjectionZone(area);

  return (
    <>
      {components.map((component) => (
        <component.Component key={component.name} {...props} />
      ))}
    </>
  );
};

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

export { InjectionZone, INJECTION_ZONES };

export type {
  InjectionZoneArea,
  InjectionZoneComponent,
  InjectionZones,
  InjectionZoneModule,
  InjectionZoneContainer,
  InjectionZoneBlock,
};
