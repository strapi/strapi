import { reducer, actions, type DataManagerStateType } from '../reducer';

import type { ContentType, Component } from '../../../types';

export const initCT = (name: string, properties: Partial<ContentType>): ContentType => {
  return {
    uid: `api::${name}.${name}`,
    globalId: name,
    modelName: name,
    kind: 'collectionType',
    modelType: 'contentType',
    restrictRelationsTo: null,
    status: 'UNCHANGED',
    visible: true,
    ...properties,
    info: {
      displayName: name,
      singularName: name,
      pluralName: name,
      ...properties.info,
    },
    attributes: [...(properties.attributes ?? [])],
  };
};

export const initCompo = (name: string, properties: Partial<Component>): Component => {
  return {
    uid: `default.${name}`,
    category: 'default',
    globalId: name,
    modelName: name,
    modelType: 'component',
    status: 'UNCHANGED',
    ...properties,
    info: {
      displayName: name,
      icon: 'test',
      ...properties.info,
    },
    attributes: [...(properties.attributes ?? [])],
  };
};

export const init = (initState: Partial<DataManagerStateType>) => {
  return reducer(
    undefined,
    actions.init({
      components: {
        ...(initState.components ?? {}),
      },
      contentTypes: {
        ...(initState.contentTypes ?? {}),
      },
      reservedNames: { models: [], attributes: [] },
    })
  );
};
