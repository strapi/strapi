import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import get from 'lodash/get';
import merge from 'lodash/merge';
import omit from 'lodash/omit';
import set from 'lodash/set';

import { getRelationType } from '../../utils/getRelationType';
import { makeUnique } from '../../utils/makeUnique';

import { formatSchema } from './utils/formatSchemas';

import type {
  DataManagerStateType,
  ContentType,
  AttributeType,
  Component,
  SchemaType,
  Status,
} from '../../types';
import type { Internal, Schema, Struct } from '@strapi/types';

// TODO: Define all possible actions based on type
export type Action<T = any> = {
  type: T;
  uid?: string;
  mainDataKey: SchemaType;
  schemaType: 'component' | 'contentType';
  attributeToRemoveName?: string;
  [key: string]: any;
};

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

const getOppositeRelation = (originalRelation?: Schema.Attribute.RelationKind.WithTarget) => {
  if (originalRelation === 'manyToOne') {
    return 'oneToMany';
  }

  if (originalRelation === 'oneToMany') {
    return 'manyToOne';
  }

  return originalRelation;
};

const findAttributeIndex = (type: any, attributeToFind?: string) => {
  return type.schema.attributes.findIndex(({ name }: { name: string }) => name === attributeToFind);
};

type InitPayload = {
  components: Record<string, Component>;
  contentTypes: Record<string, ContentType>;
  reservedNames: DataManagerStateType['reservedNames'];
};

type AddAttributePayload = {
  attributeToSet: Record<string, any>;
  forTarget: SchemaType;
  targetUid: string;
};

type AddCreateComponentToDynamicZonePayload = {
  forTarget: SchemaType;
  targetUid: string;
  dynamicZoneTarget: string;
  componentsToAdd: Internal.UID.Component[];
};

type AddCustomFieldAttributePayload = {
  attributeToSet: Record<string, any>;
  forTarget: SchemaType;
  targetUid: string;
};

type ChangeDynamicZoneComponentsPayload = {
  dynamicZoneTarget: string;
  newComponents: Internal.UID.Component[];
  forTarget: SchemaType;
  targetUid: string;
};

type CreateComponentSchemaPayload = {
  uid: string;
  data: any;
  componentCategory: string;
};

type CreateSchemaPayload = {
  uid: string;
  data: any;
};

type EditAttributePayload = {
  attributeToSet: Record<string, any>;
  forTarget: SchemaType;
  targetUid: string;
  initialAttribute: Record<string, any>;
};

type EditCustomFieldAttributePayload = {
  attributeToSet: Record<string, any>;
  forTarget: SchemaType;
  targetUid: string;
  initialAttribute: Record<string, any>;
};

type RemoveComponentFromDynamicZonePayload = {
  forTarget: SchemaType;
  targetUid: string;
  dzName: string;
  componentToRemoveIndex: number;
};

type RemoveFieldPayload = {
  forTarget: SchemaType;
  targetUid: string;
  attributeToRemoveName: string;
};

type UpdateComponentSchemaPayload = {
  data: Record<string, any>;
  uid: string;
};

type UpdateSchemaPayload = {
  data: Record<string, any>;
  uid: string;
};

const getType = (
  state: DataManagerStateType,
  {
    forTarget,
    targetUid,
  }: {
    forTarget: SchemaType;
    targetUid: string;
  }
): ContentType | Component => {
  return forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];
};

const createAttribute = (properties: Record<string, any>): Record<string, any> => {
  return {
    ...properties,
    status: 'NEW',
  };
};

const setAttributeAt = (
  type: ContentType | Component,
  index: number,
  attribute: Record<string, any>
) => {
  type.schema.attributes[index] = attribute;
  setStatus(type, 'CHANGED');
};

const pushAttribute = (type: ContentType | Component, attribute: Record<string, any>) => {
  type.schema.attributes.push(attribute);
  setStatus(type, 'CHANGED');
};

const removeAttributeAt = (type: ContentType | Component, index: number) => {
  const attr = type.schema.attributes[index];

  setStatus(type, 'CHANGED');

  if (attr.status === 'NEW') {
    type.schema.attributes.splice(index, 1);
  } else {
    setAttributeStatus(attr, 'REMOVED');
  }
};

const updateType = (type: ContentType | Component, data: Record<string, any>) => {
  merge(type, data);
  setStatus(type, 'CHANGED');
};

const slice = createSlice({
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
        isTemporary: true,
        category: componentCategory,
        schema: {
          ...data,
          visible: true,
          attributes: [],
          modelType: 'component',
        },
      };

      state.components[uid as string] = newSchema;
    },
    createSchema: (state, action: PayloadAction<CreateSchemaPayload>) => {
      const { uid, data } = action.payload;

      const newSchema: ContentType = {
        uid: uid as Internal.UID.ContentType,
        status: 'NEW',
        isTemporary: true,
        schema: {
          ...data,
          visible: true,
          attributes: [],
          modelType: 'contentType',
        },
      };

      state.contentTypes[uid] = newSchema;
    },
    addAttribute: (state, action: PayloadAction<AddAttributePayload>) => {
      const { attributeToSet, forTarget, targetUid } = action.payload;

      const type = getType(state, { forTarget, targetUid });

      const attribute = createAttribute(omit(attributeToSet, 'createComponent'));

      type.schema.attributes.push(attribute);

      setStatus(type, 'CHANGED');

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
    },
    addCustomFieldAttribute: (state, action: PayloadAction<AddCustomFieldAttributePayload>) => {
      const { attributeToSet, forTarget, targetUid } = action.payload;

      const type = getType(state, { forTarget, targetUid });

      pushAttribute(type, attributeToSet);
    },
    addCreatedComponentToDynamicZone: (
      state,
      action: PayloadAction<AddCreateComponentToDynamicZonePayload>
    ) => {
      const { dynamicZoneTarget, componentsToAdd, forTarget, targetUid } = action.payload;

      const type = getType(state, { forTarget, targetUid });

      const dzAttributeIndex = findAttributeIndex(type, dynamicZoneTarget);

      componentsToAdd.forEach((componentUid: Internal.UID.Component) => {
        if (!type.schema.attributes[dzAttributeIndex].components) {
          type.schema.attributes[dzAttributeIndex].components = [];
        }
        type.schema.attributes[dzAttributeIndex].components.push(componentUid);
      });

      setStatus(type, 'CHANGED');
    },
    changeDynamicZoneComponents: (
      state,
      action: PayloadAction<ChangeDynamicZoneComponentsPayload>
    ) => {
      const { dynamicZoneTarget, newComponents, forTarget, targetUid } = action.payload;

      const type = getType(state, { forTarget, targetUid });

      const dzAttributeIndex = findAttributeIndex(type, dynamicZoneTarget);

      const currentDZComponents = (type?.schema.attributes[dzAttributeIndex]).components;

      const updatedComponents = makeUnique([...currentDZComponents, ...newComponents]);

      setStatus(type, 'CHANGED');
      type.schema.attributes[dzAttributeIndex].components = updatedComponents;
    },
    editAttribute: (state, action: PayloadAction<EditAttributePayload>) => {
      const { attributeToSet, forTarget, targetUid, initialAttribute } = action.payload;
      const { name, ...rest } = attributeToSet;

      const initialAttributeName = initialAttribute.name;
      const type = getType(state, { forTarget, targetUid });

      const attribute = { ...attributeToSet, status: 'CHANGED' };

      const initialAttributeIndex = findAttributeIndex(type, initialAttributeName);

      const isEditingRelation = rest.type === 'relation';

      if (!isEditingRelation) {
        setAttributeAt(type, initialAttributeIndex, attribute);
        return;
      }

      const updatedAttributes: AttributeType[] = get(type, ['schema', 'attributes']).slice();

      // First create the current relation attribute updated
      const toSet = {
        name,
        relation: rest.relation,
        target: rest.target,
        targetAttribute: rest.targetAttribute,
        type: 'relation',
      } as AttributeType;

      if (rest.private) {
        toSet.private = rest.private;
      }

      if (rest.pluginOptions) {
        toSet.pluginOptions = rest.pluginOptions;
      }

      const currentAttributeIndex = updatedAttributes.findIndex((value: AttributeType) => {
        return value.name !== undefined && value.name === initialAttribute.name;
      });

      // First set it in the updatedAttributes
      if (currentAttributeIndex !== -1) {
        updatedAttributes.splice(currentAttributeIndex, 1, toSet);
      }

      let oppositeAttributeNameToRemove: string | null = null;
      let oppositeAttributeNameToUpdate: string | null = null;
      let oppositeAttributeToCreate: AttributeType | null = null;
      let initialOppositeAttribute = null;

      const currentUid = type.uid;
      const didChangeTargetRelation = initialAttribute.target !== rest.target;
      const didCreateInternalRelation = rest.target === currentUid;
      const relationType = getRelationType(rest.relation, rest.targetAttribute);
      const initialRelationType = getRelationType(
        initialAttribute.relation,
        initialAttribute.targetAttribute
      );
      const hadInternalRelation = initialAttribute.target === currentUid;
      const didChangeRelationType = initialRelationType !== relationType;
      const shouldRemoveOppositeAttributeBecauseOfTargetChange =
        didChangeTargetRelation &&
        !didCreateInternalRelation &&
        hadInternalRelation &&
        isEditingRelation;
      const shouldRemoveOppositeAttributeBecauseOfRelationTypeChange =
        didChangeRelationType &&
        hadInternalRelation &&
        ['oneWay', 'manyWay'].includes(relationType!) &&
        isEditingRelation;
      const shouldUpdateOppositeAttributeBecauseOfRelationTypeChange =
        !ONE_SIDE_RELATIONS.includes(initialRelationType!) &&
        !ONE_SIDE_RELATIONS.includes(relationType!) &&
        hadInternalRelation &&
        didCreateInternalRelation &&
        isEditingRelation;
      const shouldCreateOppositeAttributeBecauseOfRelationTypeChange =
        ONE_SIDE_RELATIONS.includes(initialRelationType!) &&
        !ONE_SIDE_RELATIONS.includes(relationType!) &&
        hadInternalRelation &&
        didCreateInternalRelation &&
        isEditingRelation;
      const shouldCreateOppositeAttributeBecauseOfTargetChange =
        didChangeTargetRelation &&
        didCreateInternalRelation &&
        !ONE_SIDE_RELATIONS.includes(relationType!);

      // Store opposite attribute name to remove at the end of the loop
      if (
        shouldRemoveOppositeAttributeBecauseOfTargetChange ||
        shouldRemoveOppositeAttributeBecauseOfRelationTypeChange
      ) {
        oppositeAttributeNameToRemove = initialAttribute.targetAttribute;
      }

      // In case of oneWay or manyWay relation there isn't an opposite attribute
      if (oppositeAttributeNameToRemove) {
        const indexToRemove = updatedAttributes.findIndex(
          (value) => value.name === oppositeAttributeNameToRemove
        );

        updatedAttributes.splice(indexToRemove, 1);
      }

      // In order to preserve plugin options need to get the initial opposite attribute settings
      if (!shouldRemoveOppositeAttributeBecauseOfTargetChange) {
        const initialTargetContentType = get(state, [
          'initialContentTypes',
          initialAttribute.target,
        ]);

        if (initialTargetContentType) {
          const oppositeAttributeIndex = findAttributeIndex(
            initialTargetContentType,
            initialAttribute.targetAttribute
          );

          initialOppositeAttribute = get(state, [
            'initialContentTypes',
            initialAttribute.target,
            'schema',
            'attributes',
            oppositeAttributeIndex,
          ]);
        }
      }

      // TODO: set status if updating opposite side

      // Create the opposite attribute
      if (
        shouldCreateOppositeAttributeBecauseOfRelationTypeChange ||
        shouldCreateOppositeAttributeBecauseOfTargetChange
      ) {
        oppositeAttributeToCreate = {
          name: rest.targetAttribute,
          relation: getOppositeRelation(relationType),
          target: rest.target,
          targetAttribute: name,
          type: 'relation',
        } as AttributeType;

        if (rest.private) {
          oppositeAttributeToCreate.private = rest.private;
        }

        if (initialOppositeAttribute && initialOppositeAttribute.pluginOptions) {
          oppositeAttributeToCreate.pluginOptions = initialOppositeAttribute.pluginOptions;
        }

        const indexOfInitialAttribute = updatedAttributes.findIndex(
          ({ name }) => name === initialAttribute.name
        );
        const indexOfUpdatedAttribute = updatedAttributes.findIndex(
          ({ name: attrName }) => name === attrName
        );

        const indexToInsert =
          (indexOfInitialAttribute === -1 ? indexOfUpdatedAttribute : indexOfInitialAttribute) + 1;

        updatedAttributes.splice(indexToInsert, 0, oppositeAttributeToCreate);
      }

      if (shouldUpdateOppositeAttributeBecauseOfRelationTypeChange) {
        oppositeAttributeNameToUpdate = initialAttribute.targetAttribute;

        oppositeAttributeToCreate = {
          name: rest.targetAttribute,
          relation: getOppositeRelation(relationType),
          target: rest.target,
          targetAttribute: name,
          type: 'relation',
        } as AttributeType;

        if (rest.private) {
          oppositeAttributeToCreate.private = rest.private;
        }

        if (initialOppositeAttribute && initialOppositeAttribute.pluginOptions) {
          oppositeAttributeToCreate.pluginOptions = initialOppositeAttribute.pluginOptions;
        }

        if (oppositeAttributeNameToUpdate) {
          const indexToUpdate = updatedAttributes.findIndex(
            ({ name }) => name === oppositeAttributeNameToUpdate
          );

          updatedAttributes.splice(indexToUpdate, 1, oppositeAttributeToCreate);
        }
      }

      setStatus(type, 'CHANGED');
      set(type, ['schema', 'attributes'], updatedAttributes);
    },
    editCustomFieldAttribute: (state, action: PayloadAction<EditCustomFieldAttributePayload>) => {
      const { forTarget, targetUid, initialAttribute, attributeToSet } = action.payload;

      const initialAttributeName = initialAttribute.name;
      const type = getType(state, { forTarget, targetUid });

      const initialAttributeIndex = findAttributeIndex(type, initialAttributeName);

      setAttributeAt(type, initialAttributeIndex, attributeToSet);
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

      setStatus(type, 'CHANGED');
      type.schema.attributes[dzAttributeIndex].components.splice(componentToRemoveIndex, 1);
    },
    removeField: (state, action: PayloadAction<RemoveFieldPayload>) => {
      const { forTarget, targetUid, attributeToRemoveName } = action.payload;

      const type = getType(state, { forTarget, targetUid });

      const attributeToRemoveIndex = findAttributeIndex(type, attributeToRemoveName);
      const attribute = type.schema.attributes[attributeToRemoveIndex];

      if (attribute.type === 'relation') {
        const { target, relation, targetAttribute: targetAttributeName } = attribute;
        const relationType = getRelationType(relation, targetAttributeName);

        const isBidirectionnal = !ONE_SIDE_RELATIONS.includes(relationType!);

        if (isBidirectionnal) {
          const targetContentType = getType(state, { forTarget, targetUid: target });
          const targetAttributeIndex = findAttributeIndex(targetContentType, targetAttributeName);

          removeAttributeAt(targetContentType, targetAttributeIndex);
        }
      }

      // Find all uid fields that have the targetField set to the field we are removing
      type.schema.attributes.forEach((attribute: AttributeType) => {
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
        schema: {
          displayName: data.displayName,
          icon: data.icon,
        },
      });
    },
    updateSchema: (state, action: PayloadAction<UpdateSchemaPayload>) => {
      const { data, uid } = action.payload;

      const type = state.contentTypes[uid];
      if (!type) {
        return;
      }

      updateType(type, { schema: data });
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
        contentType.schema.attributes.forEach((attribute) => {
          if (attribute.type === 'dynamiczone') {
            const newComponents = attribute.components.filter(
              (component: unknown) => component !== uid
            );

            attribute.components = newComponents;
          }
        });

        contentType.schema.attributes.forEach((attribute) => {
          if (attribute.type === 'component' && attribute.component === uid) {
            setAttributeStatus(attribute, 'REMOVED');
            setStatus(contentType, 'CHANGED');
          }
        });
      });

      // remove the compo from other components
      Object.keys(state.components).forEach((componentUid) => {
        const component = state.components[componentUid];

        component.schema.attributes.forEach((attribute) => {
          if (attribute.type === 'component' && attribute.component === uid) {
            setAttributeStatus(attribute, 'REMOVED');
            setStatus(component, 'CHANGED');
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

        component.schema.attributes.forEach((attribute) => {
          if (attribute.type === 'relation' && attribute.target === uid) {
            setAttributeStatus(attribute, 'REMOVED');
            setStatus(component, 'CHANGED');
          }
        });
      });

      // remove the content type from the content types
      Object.keys(state.contentTypes).forEach((contentTypeUid) => {
        const contentType = state.contentTypes[contentTypeUid];

        contentType.schema.attributes.forEach((attribute) => {
          if (attribute.type === 'relation' && attribute.target === uid) {
            setAttributeStatus(attribute, 'REMOVED');
            setStatus(contentType, 'CHANGED');
          }
        });
      });
    },

    applyChange(
      state,
      reducerAction: PayloadAction<{
        action: 'add' | 'update' | 'delete';
        schema: Struct.Schema;
      }>
    ) {
      const { action, schema } = reducerAction.payload;

      switch (action) {
        case 'add': {
          // generate a uid ?
          const uid = schema.uid;

          if (schema.modelType === 'component') {
            state.components[uid] = {
              ...formatSchema(schema),
              status: 'NEW',
            };
          } else {
            state.contentTypes[uid] = {
              ...formatSchema(schema),
              status: 'NEW',
            };
          }
        }
      }
    },
  },
});

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

const setAttributeStatus = (attribute: Record<string, any>, status: Status) => {
  switch (attribute.status) {
    case 'NEW':
    case 'REMOVED': {
      break;
    }
    default: {
      attribute.status = status;
    }
  }
};

export const { reducer, actions } = slice;
export { initialState };
