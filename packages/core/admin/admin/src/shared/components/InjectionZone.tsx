import * as React from 'react';

import { useInjectionZone } from '../hooks/useInjectionZone';

const INJECTION_ZONES = {
  admin: {
    // Temporary injection zone, support for the react-tour plugin in foodadvisor
    tutorials: {
      links: [],
    },
  },
  contentManager: {
    editView: { informations: [], 'right-links': [] },
    listView: {
      actions: [],
      deleteModalAdditionalInfos: [],
      publishModalAdditionalInfos: [],
      unpublishModalAdditionalInfos: [],
    },
  },
} satisfies InjectionZones;

interface InjectionZoneComponent {
  Component: React.ComponentType;
  name: string;
  // TODO: in theory this could receive and forward any React component prop
  // but in practice there only seems to be once instance, where `slug` is
  // forwarded. The type needs to become either more generic or we disallow
  // prop spreading and offer a different way to access context data.
  slug: string;
}

interface InjectionZones {
  admin: {
    tutorials: {
      links: InjectionZoneComponent[];
    };
  };
  contentManager: {
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
  };
}

type InjectionZoneArea =
  | 'admin.tutorials.links'
  | 'contentManager.editView.informations'
  | 'contentManager.editView.right-links'
  | 'contentManager.listView.actions'
  | 'contentManager.listView.unpublishModalAdditionalInfos'
  | 'contentManager.listView.deleteModalAdditionalInfos'
  | 'contentManager.listView.publishModalAdditionalInfos'
  | 'contentManager.listView.deleteModalAdditionalInfos';

type InjectionZoneModule = InjectionZoneArea extends `${infer Word}.${string}` ? Word : never;
type InjectionZoneContainer = InjectionZoneArea extends `${string}.${infer Word}.${string}`
  ? Word
  : never;
type InjectionZoneBlock = InjectionZoneArea extends `${string}.${string}.${infer Word}`
  ? Word
  : never;

const InjectionZone = ({ area, ...props }: { area: InjectionZoneArea }) => {
  const components = useInjectionZone(area);

  return components.map((component) => <component.Component key={component.name} {...props} />);
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
