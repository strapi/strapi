import { PayloadAction } from '@reduxjs/toolkit';
import merge from 'lodash/merge';
import omit from 'lodash/omit';

import { getRelationType } from '../../utils/getRelationType';
import { makeUnique } from '../../utils/makeUnique';

import { createUndoRedoSlice } from './undoRedo';

import type {
  Components,
  ContentTypes,
  ContentType,
  Component,
  Status,
  AnyAttribute,
} from '../../types';
import type { Internal, Schema, Struct, UID } from '@strapi/types';

export interface DataManagerStateType {
  components: Components;
  initialComponents: Components;
  contentTypes: ContentTypes;
  initialContentTypes: ContentTypes;
  reservedNames: {
    models: string[];
    attributes: string[];
  };
  isLoading: boolean;
  [key: string]: any;
}

const initialState: DataManagerStateType = {
  components: {},
  contentTypes: {},
  initialComponents: {},
  initialContentTypes: {},
  reservedNames: {
    models: [],
    attributes: [],
  },
  isLoading: true,
};

const ONE_SIDE_RELATIONS = ['oneWay', 'manyWay'];

const getOppositeRelation = (originalRelation?: Schema.Attribute.RelationKind.Any) => {
  if (originalRelation === 'manyToOne') {
    return 'oneToMany';
  }

  if (originalRelation === 'oneToMany') {
    return 'manyToOne';
  }

  return originalRelation;
};

const findAttributeIndex = (type: any, attributeToFind?: string) => {
  return type.attributes.findIndex(({ name }: { name: string }) => name === attributeToFind);
};

type InitPayload = {
  components: Record<string, Component>;
  contentTypes: Record<string, ContentType>;
  reservedNames: DataManagerStateType['reservedNames'];
};

type AddAttributePayload = {
  attributeToSet: Record<string, any>;
  forTarget: Struct.ModelType;
  targetUid: string;
};

type AddCreateComponentToDynamicZonePayload = {
  forTarget: Struct.ModelType;
  targetUid: string;
  dynamicZoneTarget: string;
  componentsToAdd: Internal.UID.Component[];
};

type AddCustomFieldAttributePayload = {
  attributeToSet: Record<string, any>;
  forTarget: Struct.ModelType;
  targetUid: string;
};

type ChangeDynamicZoneComponentsPayload = {
  dynamicZoneTarget: string;
  newComponents: Internal.UID.Component[];
  forTarget: Struct.ModelType;
  targetUid: string;
};

type CreateComponentSchemaPayload = {
  uid: string;
  data: {
    icon: string;
    displayName: string;
  };
  componentCategory: string;
};

type CreateSchemaPayload = {
  uid: string;
  data: {
    displayName: string;
    singularName: string;
    pluralName: string;
    kind: Struct.ContentTypeKind;
    draftAndPublish: boolean;
    pluginOptions: Record<string, any>;
  };
};

type EditAttributePayload = {
  attributeToSet: Record<string, any>;
  forTarget: Struct.ModelType;
  targetUid: string;
  name: string;
};

type EditCustomFieldAttributePayload = {
  attributeToSet: Record<string, any>;
  forTarget: Struct.ModelType;
  targetUid: string;
  name: string;
};

type RemoveComponentFromDynamicZonePayload = {
  forTarget: Struct.ModelType;
  targetUid: string;
  dzName: string;
  componentToRemoveIndex: number;
};

type RemoveFieldPayload = {
  forTarget: Struct.ModelType;
  targetUid: string;
  attributeToRemoveName: string;
};

type UpdateComponentSchemaPayload = {
  data: {
    icon: string;
    displayName: string;
  };
  uid: Internal.UID.Component;
};

type UpdateComponentUIDPayload = {
  uid: Internal.UID.Component;
  newComponentUID: Internal.UID.Component;
};

type UpdateSchemaPayload = {
  data: {
    displayName: string;
    kind: Struct.ContentTypeKind;
    draftAndPublish: boolean;
    pluginOptions: Record<string, any>;
  };
  uid: string;
};

type MoveAttributePayload = {
  forTarget: Struct.ModelType;
  targetUid: string;
  from: number;
  to: number;
};

const getType = (
  state: DataManagerStateType,
  {
    forTarget,
    targetUid,
  }: {
    forTarget: Struct.ModelType;
    targetUid: string;
  }
) => {
  return forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];
};

// TODO: use initial state when chnaging back to the initial state without knowing
const setStatus = (type: ContentType | Component, status: Status) => {
  switch (type.status) {
    case 'NEW':
    case 'REMOVED': {
      break;
    }
    default: {
      type.status = status;
    }
  }
};

const getNewStatus = (oldStatus: Status | undefined, newStatus: Status) => {
  if (oldStatus === 'NEW' || oldStatus === 'REMOVED') {
    return oldStatus;
  }

  return newStatus;
};

const setAttributeStatus = (attribute: Record<string, any>, status: Status) => {
  attribute.status = getNewStatus(attribute.status, status);
};

const createAttribute = (properties: Record<string, any>): AnyAttribute => {
  return {
    ...properties,
    status: 'NEW',
  } as AnyAttribute;
};

const setAttributeAt = (type: ContentType | Component, index: number, attribute: AnyAttribute) => {
  const previousAttribute = type.attributes[index];

  const newStatus = getNewStatus(previousAttribute.status, 'CHANGED');

  type.attributes[index] = {
    ...attribute,
    status: newStatus,
  };

  setStatus(type, 'CHANGED');
};

const pushAttribute = (type: ContentType | Component, attribute: AnyAttribute) => {
  type.attributes.push(attribute);
  setStatus(type, 'CHANGED');
};

const removeAttributeAt = (type: ContentType | Component, index: number) => {
  const attr = type.attributes[index];

  setStatus(type, 'CHANGED');

  if (attr.status === 'NEW') {
    type.attributes.splice(index, 1);
  } else {
    setAttributeStatus(attr, 'REMOVED');
  }
};

const replaceAttributeAt = (
  type: ContentType | Component,
  index: number,
  attribute: AnyAttribute
) => {
  type.attributes[index] = attribute;
  setStatus(type, 'CHANGED');
};

const removeAttributeByName = (type: ContentType | Component, name: string) => {
  const idx = type.attributes.findIndex((attr) => attr.name === name);

  const attr = type.attributes[idx];

  setStatus(type, 'CHANGED');

  if (attr.status === 'NEW') {
    type.attributes.splice(idx, 1);
  } else {
    setAttributeStatus(attr, 'REMOVED');
  }
};

const updateType = (type: ContentType | Component, data: Record<string, any>) => {
  merge(type, data);
  setStatus(type, 'CHANGED');
};

const slice = createUndoRedoSlice(
  {
    name: 'data-manager',
    initialState,
    reducers: {
      init: (state, action: PayloadAction<InitPayload>) => {
        const { components, contentTypes, reservedNames } = action.payload;

        state.components = components;
        state.initialComponents = components;
        state.initialContentTypes = contentTypes;
        state.contentTypes = contentTypes;
        state.reservedNames = reservedNames;
        state.isLoading = false;
      },
      createComponentSchema: (state, action: PayloadAction<CreateComponentSchemaPayload>) => {
        const { uid, data, componentCategory } = action.payload;

        const newSchema: Component = {
          uid: uid as Internal.UID.Component,
          status: 'NEW',
          category: componentCategory,
          modelName: data.displayName,
          globalId: data.displayName,
          info: {
            icon: data.icon,
            displayName: data.displayName,
          },
          attributes: [],
          modelType: 'component',
        };

        state.components[uid as string] = newSchema;
      },
      createSchema: (state, action: PayloadAction<CreateSchemaPayload>) => {
        const { uid, data } = action.payload;

        const { displayName, singularName, pluralName, kind, draftAndPublish, pluginOptions } =
          data;

        const newSchema: ContentType = {
          uid: uid as Internal.UID.ContentType,
          status: 'NEW',
          visible: true,
          modelType: 'contentType',
          restrictRelationsTo: null,
          attributes: [],
          kind,
          modelName: displayName,
          globalId: displayName,
          options: {
            draftAndPublish,
          },
          info: {
            displayName,
            singularName,
            pluralName,
          },
          pluginOptions,
        };

        state.contentTypes[uid] = newSchema;
      },
      addAttribute: (state, action: PayloadAction<AddAttributePayload>) => {
        const { attributeToSet, forTarget, targetUid } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const attribute = createAttribute(omit(attributeToSet, 'createComponent'));

        if (attribute.type === 'relation') {
          const target = attribute.target;
          const targetAttribute = attribute.targetAttribute || null;
          const relation = attribute.relation;
          const relationType = getRelationType(relation, targetAttribute);

          const isBidirectionalRelation = !['oneWay', 'manyWay'].includes(relationType);

          if (isBidirectionalRelation) {
            const oppositeAttribute = createAttribute({
              name: targetAttribute,
              relation: getOppositeRelation(relationType),
              target: type.uid,
              targetAttribute: attribute.name,
              type: 'relation',
              private: attribute.private,
            });

            const targetType = getType(state, { forTarget, targetUid: target });
            pushAttribute(targetType, oppositeAttribute);
          }
        }

        pushAttribute(type, attribute);
        setStatus(type, 'CHANGED');
      },
      moveAttribute: (state, action: PayloadAction<MoveAttributePayload>) => {
        const { forTarget, targetUid, from, to } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const attribute = type.attributes[from];
        type.attributes.splice(from, 1);
        type.attributes.splice(to, 0, attribute);
        setStatus(type, 'CHANGED');
      },
      addCustomFieldAttribute: (state, action: PayloadAction<AddCustomFieldAttributePayload>) => {
        const { attributeToSet, forTarget, targetUid } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        pushAttribute(type, createAttribute(attributeToSet));
      },
      addCreatedComponentToDynamicZone: (
        state,
        action: PayloadAction<AddCreateComponentToDynamicZonePayload>
      ) => {
        const { dynamicZoneTarget, componentsToAdd, forTarget, targetUid } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const dzAttributeIndex = findAttributeIndex(type, dynamicZoneTarget);
        const attr = type.attributes[dzAttributeIndex] as Schema.Attribute.DynamicZone;

        componentsToAdd.forEach((componentUid: Internal.UID.Component) => {
          attr.components.push(componentUid);
        });

        setAttributeStatus(attr, 'CHANGED');
        setStatus(type, 'CHANGED');
      },
      changeDynamicZoneComponents: (
        state,
        action: PayloadAction<ChangeDynamicZoneComponentsPayload>
      ) => {
        const { dynamicZoneTarget, newComponents, forTarget, targetUid } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const dzAttributeIndex = findAttributeIndex(type, dynamicZoneTarget);
        const attr = type.attributes[dzAttributeIndex] as Schema.Attribute.DynamicZone;
        const currentDZComponents = attr.components;

        const updatedComponents = makeUnique([...currentDZComponents, ...newComponents]);

        setStatus(type, 'CHANGED');
        setAttributeStatus(attr, 'CHANGED');
        attr.components = updatedComponents;
      },
      editAttribute: (state, action: PayloadAction<EditAttributePayload>) => {
        const { name, attributeToSet, forTarget, targetUid } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const initialAttributeIndex = findAttributeIndex(type, name);

        if (initialAttributeIndex === -1) {
          return;
        }

        const previousAttribute = type.attributes[initialAttributeIndex];

        setAttributeAt(type, initialAttributeIndex, attributeToSet as AnyAttribute);

        if (previousAttribute.type !== attributeToSet.type) {
          return;
        }

        if (previousAttribute.type !== 'relation' || attributeToSet.type !== 'relation') {
          return;
        }

        const previousTarget = getType(state, {
          forTarget: 'contentType',
          targetUid: previousAttribute.target,
        });
        const newTarget = getType(state, {
          forTarget: 'contentType',
          targetUid: attributeToSet.target,
        });

        const previousTargetAttributeIndex = findAttributeIndex(
          previousTarget,
          previousAttribute.targetAttribute ?? ''
        );

        // remove old targetAttribute
        if (previousAttribute.targetAttribute) {
          removeAttributeByName(previousTarget, previousAttribute.targetAttribute);
        }

        const newRelationType = getRelationType(
          attributeToSet.relation,
          attributeToSet.targetAttribute
        );
        const isBidirectionnal = !ONE_SIDE_RELATIONS.includes(newRelationType);

        if (isBidirectionnal) {
          const newTargetAttribute = {
            name: attributeToSet.targetAttribute,
            type: 'relation',
            relation: getOppositeRelation(attributeToSet.relation),
            targetAttribute: attributeToSet.name,
            target: type.uid,
            private: previousAttribute.private ?? attributeToSet.private,
            pluginOptions: previousAttribute.pluginOptions ?? attributeToSet.pluginOptions,
            status: 'CHANGED',
          } as AnyAttribute;

          // create or recreate(at old index) targetAttribute
          if (previousTargetAttributeIndex !== -1 && previousTarget.uid === newTarget.uid) {
            // re-create at previousIdx if possible
            replaceAttributeAt(newTarget, previousTargetAttributeIndex, newTargetAttribute);
          } else {
            pushAttribute(newTarget, {
              ...newTargetAttribute,
              status: 'NEW',
            });
          }
        }
      },
      editCustomFieldAttribute: (state, action: PayloadAction<EditCustomFieldAttributePayload>) => {
        const { forTarget, targetUid, name, attributeToSet } = action.payload;

        const initialAttributeName = name;
        const type = getType(state, { forTarget, targetUid });

        const initialAttributeIndex = findAttributeIndex(type, initialAttributeName);

        setAttributeAt(type, initialAttributeIndex, attributeToSet as AnyAttribute);
      },
      reloadPlugin: () => {
        return initialState;
      },
      removeComponentFromDynamicZone: (
        state,
        action: PayloadAction<RemoveComponentFromDynamicZonePayload>
      ) => {
        const { dzName, componentToRemoveIndex, forTarget, targetUid } = action.payload;

        const type =
          forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];

        if (!type) {
          return;
        }

        const dzAttributeIndex = findAttributeIndex(type, dzName);
        const attr = type.attributes[dzAttributeIndex] as Schema.Attribute.DynamicZone;

        setStatus(type, 'CHANGED');
        setAttributeStatus(attr, 'CHANGED');
        attr.components.splice(componentToRemoveIndex, 1);
      },
      removeField: (state, action: PayloadAction<RemoveFieldPayload>) => {
        const { forTarget, targetUid, attributeToRemoveName } = action.payload;

        const type = getType(state, { forTarget, targetUid });

        const attributeToRemoveIndex = findAttributeIndex(type, attributeToRemoveName);
        const attribute = type.attributes[attributeToRemoveIndex];

        if (attribute.type === 'relation') {
          const { target, relation, targetAttribute: targetAttributeName } = attribute;
          const relationType = getRelationType(relation, targetAttributeName);

          const isBidirectionnal = !ONE_SIDE_RELATIONS.includes(relationType!);

          if (isBidirectionnal && targetAttributeName) {
            const targetContentType = getType(state, { forTarget, targetUid: target });
            const targetAttributeIndex = findAttributeIndex(targetContentType, targetAttributeName);

            removeAttributeAt(targetContentType, targetAttributeIndex);
          }
        }

        // Find all uid fields that have the targetField set to the field we are removing
        type.attributes.forEach((attribute) => {
          if (attribute.type === 'uid') {
            if (attribute.targetField === attributeToRemoveName) {
              delete attribute.targetField;
            }
          }
        });

        removeAttributeAt(type, attributeToRemoveIndex);
      },
      // only edits a component in practice
      updateComponentSchema: (state, action: PayloadAction<UpdateComponentSchemaPayload>) => {
        const { data, uid } = action.payload;

        const type = state.components[uid];
        if (!type) {
          return;
        }

        updateType(type, {
          info: {
            displayName: data.displayName,
            icon: data.icon,
          },
        });
      },
      updateComponentUid: (state, action: PayloadAction<UpdateComponentUIDPayload>) => {
        const { newComponentUID, uid } = action.payload;

        const type = state.components[uid];
        if (!type || type.status !== 'NEW') {
          return;
        }

        if (newComponentUID !== uid) {
          const newType = { ...type, uid: newComponentUID };
          state.components[newComponentUID] = newType;
          delete state.components[uid];

          // update the uid in the content types
          Object.keys(state.contentTypes).forEach((contentTypeUid) => {
            const contentType = state.contentTypes[contentTypeUid];

            contentType.attributes.forEach((attribute) => {
              if (attribute.type === 'dynamiczone') {
                const newComponents = attribute.components.map((component: UID.Component) => {
                  if (component === uid) {
                    return newComponentUID;
                  }

                  return component;
                });

                attribute.components = newComponents;
              }
            });

            contentType.attributes.forEach((attribute) => {
              if (attribute.type === 'component' && attribute.component === uid) {
                attribute.component = newComponentUID;
              }
            });
          });

          // update the uid in the other components
          Object.keys(state.components).forEach((componentUid) => {
            const component = state.components[componentUid];

            component.attributes.forEach((attribute) => {
              if (attribute.type === 'component' && attribute.component === uid) {
                attribute.component = newComponentUID;
              }
            });
          });
        }
      },
      updateSchema: (state, action: PayloadAction<UpdateSchemaPayload>) => {
        const { data, uid } = action.payload;

        const { displayName, kind, draftAndPublish, pluginOptions } = data;

        const type = state.contentTypes[uid];
        if (!type) {
          return;
        }

        updateType(type, {
          info: {
            displayName,
          },
          kind,
          options: {
            draftAndPublish,
          },
          pluginOptions,
        });
      },
      deleteComponent: (state, action: PayloadAction<Internal.UID.Component>) => {
        const uid = action.payload;

        // remove the compo from the components
        if (state.components[uid].status === 'NEW') {
          delete state.components[uid];
        } else {
          setStatus(state.components[uid], 'REMOVED');
        }

        // remove the compo from the content types
        Object.keys(state.contentTypes).forEach((contentTypeUid) => {
          const contentType = state.contentTypes[contentTypeUid];

          // remove from dynamic zones
          contentType.attributes.forEach((attribute) => {
            if (attribute.type === 'dynamiczone') {
              const newComponents = attribute.components.filter(
                (component: unknown) => component !== uid
              );

              attribute.components = newComponents;
            }
          });

          contentType.attributes.forEach((attribute) => {
            if (attribute.type === 'component' && attribute.component === uid) {
              removeAttributeByName(contentType, attribute.name);
            }
          });
        });

        // remove the compo from other components
        Object.keys(state.components).forEach((componentUid) => {
          const component = state.components[componentUid];

          component.attributes.forEach((attribute) => {
            if (attribute.type === 'component' && attribute.component === uid) {
              removeAttributeByName(component, attribute.name);
            }
          });
        });
      },
      deleteContentType: (state, action: PayloadAction<Internal.UID.ContentType>) => {
        const uid = action.payload;
        const type = state.contentTypes[uid];

        // just drop new content types
        if (type.status === 'NEW') {
          delete state.contentTypes[uid];
        } else {
          setStatus(type, 'REMOVED');
        }

        // remove the content type from the components
        Object.keys(state.components).forEach((componentUid) => {
          const component = state.components[componentUid];

          component.attributes.forEach((attribute) => {
            if (attribute.type === 'relation' && attribute.target === uid) {
              removeAttributeByName(component, attribute.name);
            }
          });
        });

        // remove the content type from the content types
        Object.keys(state.contentTypes).forEach((contentTypeUid) => {
          const contentType = state.contentTypes[contentTypeUid];

          contentType.attributes.forEach((attribute) => {
            if (attribute.type === 'relation' && attribute.target === uid) {
              removeAttributeByName(contentType, attribute.name);
            }
          });
        });
      },

      applyChange(
        state,
        reducerAction: PayloadAction<{
          action: 'add' | 'update' | 'delete';
          schema: ContentType | Component;
        }>
      ) {
        const { action, schema } = reducerAction.payload;

        switch (action) {
          case 'add':
            {
              const uid = schema.uid;

              if (schema.modelType === 'component') {
                state.components[uid] = schema;
              } else {
                state.contentTypes[uid] = schema;
              }
            }
            break;
          case 'update':
            {
              const uid = schema.uid;

              // Find the schema, if the state was "create", we should keep it as it was before

              if (schema.modelType === 'component') {
                const component = state.components[uid];
                state.components[uid] = {
                  ...schema,
                  status: component?.status === 'NEW' ? 'NEW' : schema.status,
                };
              } else {
                const contentType = state.contentTypes[uid];
                state.contentTypes[uid] = {
                  ...schema,
                  status: contentType?.status === 'NEW' ? 'NEW' : schema.status,
                };
              }
            }
            break;
          case 'delete': {
            const uid = schema.uid;
            const isComponent = schema.modelType === 'component';
            // It's a component that has yet not been added
            if (isComponent) {
              const exists = state.components[uid];
              if (!exists) {
                return;
              }

              const isUnsaved = state.components[uid]?.status === 'NEW';
              if (isUnsaved) {
                delete state.components[uid];
              } else {
                state.components[uid].status = 'REMOVED';
              }
            } else {
              const exists = state.contentTypes[uid];
              if (!exists) {
                return;
              }

              const isUnsaved = state.contentTypes[uid]?.status === 'NEW';
              if (isUnsaved) {
                delete state.contentTypes[uid];
              } else {
                state.contentTypes[uid].status = 'REMOVED';
              }
            }

            break;
          }
        }
      },
    },
  },

  {
    limit: 50,
    excludeActionsFromHistory: ['reloadPlugin', 'init'],
    stateSelector: (state) => {
      if (!state) {
        return {};
      }

      return {
        components: state.components,
        contentTypes: state.contentTypes,
      };
    },
    discard: (state) => {
      state.components = state.initialComponents;
      state.contentTypes = state.initialContentTypes;
    },
  }
);

export type State = ReturnType<typeof slice.reducer>;
export const { reducer, actions } = slice;
export { initialState };
