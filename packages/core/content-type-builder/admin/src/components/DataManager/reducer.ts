import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import get from 'lodash/get';
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

const findAttributeIndex = (schema: any, attributeToFind?: string) => {
  return schema.schema.attributes.findIndex(
    ({ name }: { name: string }) => name === attributeToFind
  );
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
    addAttribute: (state, action: PayloadAction<AddAttributePayload>) => {
      const { attributeToSet, forTarget, targetUid } = action.payload;
      const { name, ...rest } = attributeToSet;

      delete rest.createComponent;

      const type =
        forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];

      const currentAttributes = get(type, ['schema', 'attributes'], []).slice();

      // Add the createdAttribute
      const updatedAttributes = [...currentAttributes, { ...rest, name }];

      type.status = 'CHANGED';
      set(type, ['schema', 'attributes'], updatedAttributes);

      const isCreatingRelationAttribute = rest.type === 'relation';

      if (isCreatingRelationAttribute) {
        const target = rest.target;
        const targetAttribute = rest.targetAttribute || null;
        const relation = rest.relation;
        const relationType = getRelationType(relation, targetAttribute);
        const currentUid = type.uid;

        // When the user in creating a relation with the same content type we need to create another attribute
        // that is the opposite of the created one
        if (
          rest.type === 'relation' &&
          relationType !== 'oneWay' &&
          relationType !== 'manyWay' &&
          target === currentUid
        ) {
          const oppositeAttribute = {
            name: targetAttribute,
            relation: getOppositeRelation(relationType),
            target,
            targetAttribute: name,
            type: 'relation',
          } as AttributeType;

          if (rest.private) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            oppositeAttribute.private = rest.private;
          }

          const attributesToSet = [...updatedAttributes, oppositeAttribute];

          set(type, ['schema', 'attributes'], attributesToSet);
        }
      }
    },
    addCreatedComponentToDynamicZone: (
      state,
      action: PayloadAction<AddCreateComponentToDynamicZonePayload>
    ) => {
      const { dynamicZoneTarget, componentsToAdd, forTarget, targetUid } = action.payload;

      const type =
        forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];

      const dzAttributeIndex = findAttributeIndex(type, dynamicZoneTarget);

      componentsToAdd.forEach((componentUid: Internal.UID.Component) => {
        if (!type.schema.attributes[dzAttributeIndex].components) {
          type.schema.attributes[dzAttributeIndex].components = [];
        }
        type.schema.attributes[dzAttributeIndex].components.push(componentUid);
      });

      type.status = 'CHANGED';
    },
    addCustomFieldAttribute: (state, action: PayloadAction<AddCustomFieldAttributePayload>) => {
      const { attributeToSet, forTarget, targetUid } = action.payload;
      const { name, ...rest } = attributeToSet;

      const type =
        forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];

      const currentAttributes = get(type, ['schema', 'attributes'], []).slice();

      // Add the createdAttribute
      const updatedAttributes = [...currentAttributes, { ...rest, name }];

      type.status = 'CHANGED';
      set(type, ['schema', 'attributes'], updatedAttributes);
    },
    changeDynamicZoneComponents: (
      state,
      action: PayloadAction<ChangeDynamicZoneComponentsPayload>
    ) => {
      const { dynamicZoneTarget, newComponents, forTarget, targetUid } = action.payload;

      const type =
        forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];

      const dzAttributeIndex = findAttributeIndex(type, dynamicZoneTarget);

      const currentDZComponents = (type?.schema.attributes[dzAttributeIndex]).components;

      const updatedComponents = makeUnique([...currentDZComponents, ...newComponents]);

      type.status = 'CHANGED';
      type.schema.attributes[dzAttributeIndex].components = updatedComponents;
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
    editAttribute: (state, action: PayloadAction<EditAttributePayload>) => {
      const { attributeToSet, forTarget, targetUid, initialAttribute } = action.payload;
      const { name, ...rest } = attributeToSet;

      const initialAttributeName = initialAttribute.name;
      const type =
        forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];

      const initialAttributeIndex = findAttributeIndex(type, initialAttributeName);

      const isEditingRelation = rest.type === 'relation';

      if (!isEditingRelation) {
        type.status = 'CHANGED';
        set(type, ['schema', 'attributes', initialAttributeIndex], attributeToSet);
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

      type.status = 'CHANGED';
      set(type, ['schema', 'attributes'], updatedAttributes);
    },
    editCustomFieldAttribute: (state, action: PayloadAction<EditCustomFieldAttributePayload>) => {
      const { forTarget, targetUid, initialAttribute, attributeToSet } = action.payload;

      const initialAttributeName = initialAttribute.name;
      const type =
        forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];

      const initialAttributeIndex = findAttributeIndex(type, initialAttributeName);

      type.status = 'CHANGED';
      set(type, ['schema', 'attributes', initialAttributeIndex], attributeToSet);
    },
    deleteNotSavedType: (state) => {
      // Doing so will also reset the modified and the initial data
      state.contentTypes = state.initialContentTypes;
      state.components = state.initialComponents;
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

      type.status = 'CHANGED';
      type.schema.attributes[dzAttributeIndex].components.splice(componentToRemoveIndex, 1);
    },
    removeField: (state, action: PayloadAction<RemoveFieldPayload>) => {
      const { forTarget, targetUid, attributeToRemoveName } = action.payload;

      const type =
        forTarget === 'contentType' ? state.contentTypes[targetUid] : state.components[targetUid];

      const attributeToRemoveIndex = findAttributeIndex(type, attributeToRemoveName);

      const attributeToRemoveData = get(type, ['schema', 'attributes', attributeToRemoveIndex]);
      const isRemovingRelationAttribute = attributeToRemoveData.type === 'relation';
      // Only content types can have relations with themselves since
      // components can only have oneWay or manyWay relations
      const canTheAttributeToRemoveHaveARelationWithItself = forTarget === 'contentType';

      if (isRemovingRelationAttribute && canTheAttributeToRemoveHaveARelationWithItself) {
        const { target, relation, targetAttribute } = attributeToRemoveData;
        const relationType = getRelationType(relation, targetAttribute);

        const uid = state.modifiedData.contentType?.uid;
        const shouldRemoveOppositeAttribute =
          target === uid && !ONE_SIDE_RELATIONS.includes(relationType!);

        if (shouldRemoveOppositeAttribute) {
          const attributes: AttributeType[] = type.schema.attributes.slice();
          const nextAttributes = attributes.filter((attribute) => {
            if (attribute.name === attributeToRemoveName) {
              return false;
            }

            if (attribute.target === uid && attribute.targetAttribute === attributeToRemoveName) {
              return false;
            }

            return true;
          });

          const schema = type;
          if (schema) {
            schema.schema.attributes = nextAttributes;
          }

          return;
        }
      }

      // Find all uid fields that have the targetField set to the field we are removing

      const uidFieldsToUpdate: string[] = type.schema.attributes
        .slice()
        .reduce((acc: string[], current: AttributeType) => {
          if (current.type !== 'uid') {
            return acc;
          }

          if (current.targetField !== attributeToRemoveName) {
            return acc;
          }

          acc.push(current.name as string);

          return acc;
        }, []);

      uidFieldsToUpdate.forEach((fieldName) => {
        const fieldIndex = findAttributeIndex(type, fieldName);

        delete type.schema.attributes[fieldIndex].targetField;
      });

      type.status = 'CHANGED';
      type.schema.attributes.splice(attributeToRemoveIndex, 1);
    },
    // only edits a component in practice
    updateComponentSchema: (state, action: PayloadAction<UpdateComponentSchemaPayload>) => {
      const { data, uid } = action.payload;

      const type = state.components[uid];
      if (!type) {
        return;
      }

      type.status = 'CHANGED';

      type.schema.displayName = data.displayName;
      type.schema.icon = data.icon;
    },
    updateSchema: (state, action: PayloadAction<UpdateSchemaPayload>) => {
      const { data, uid } = action.payload;

      const type = state.contentTypes[uid];
      if (!type) {
        return;
      }

      type.status = 'CHANGED';
      type.schema = {
        ...type.schema,
        ...data,
      };
    },
    deleteComponent: (state, action: PayloadAction<Internal.UID.Component>) => {
      const uid = action.payload;

      // remove the compo from the components
      // delete state.components[uid];
      state.components[uid].status = 'REMOVED';

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

        const newAttributes = contentType.schema.attributes.filter(
          (attribute) => attribute.type !== 'component' || attribute.component !== uid
        );

        contentType.schema.attributes = newAttributes;
      });

      // remove the compo from other components
      Object.keys(state.components).forEach((componentUid) => {
        const component = state.components[componentUid];

        const newAttributes = component.schema.attributes.filter(
          (attribute) => attribute.type !== 'component' || attribute.component !== uid
        );

        component.schema.attributes = newAttributes;
      });
    },
    deleteContentType: (state, action: PayloadAction<Internal.UID.ContentType>) => {
      const uid = action.payload;

      // remove the content type from the content types
      state.contentTypes[uid].status = 'REMOVED';

      // remove the content type from the components
      Object.keys(state.components).forEach((componentUid) => {
        const component = state.components[componentUid];

        const newAttributes = component.schema.attributes.filter(
          (attribute) => attribute.type !== 'relation' || attribute.target !== uid
        );

        component.schema.attributes = newAttributes;
      });

      // remove the content type from the content types
      Object.keys(state.contentTypes).forEach((contentTypeUid) => {
        const contentType = state.contentTypes[contentTypeUid];

        const newAttributes = contentType.schema.attributes.filter(
          (attribute) => attribute.type !== 'relation' || attribute.target !== uid
        );

        contentType.schema.attributes = newAttributes;
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
            state.components[uid] = formatSchema(schema);
          } else {
            state.contentTypes[uid] = formatSchema(schema);
          }
        }
      }
    },
  },
});

export const { reducer, actions } = slice;
export { initialState };
