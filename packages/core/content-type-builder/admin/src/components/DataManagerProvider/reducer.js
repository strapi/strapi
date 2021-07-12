// import { fromJS, OrderedMap } from 'immutable';
import produce, { current } from 'immer';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import set from 'lodash/set';
import makeUnique from '../../utils/makeUnique';
import getRelationType from '../../utils/getRelationType';
import retrieveComponentsFromSchema from './utils/retrieveComponentsFromSchema';
import * as actions from './constants';

const initialState = {
  components: {},
  contentTypes: {},
  initialComponents: {},
  initialContentTypes: {},
  initialData: {},
  modifiedData: {},
  reservedNames: {},
  isLoading: true,
  isLoadingForDataToBeSet: true,
};

const ONE_SIDE_RELATIONS = ['oneWay', 'manyWay'];

const getOppositeRelation = originalRelation => {
  if (originalRelation === 'manyToOne') {
    return 'oneToMany';
  }

  if (originalRelation === 'oneToMany') {
    return 'manyToOne';
  }

  return originalRelation;
};

const addComponentsToState = (state, componentToAddUid, objToUpdate) => {
  let newObj = objToUpdate;
  const componentToAdd = state.getIn(['components', componentToAddUid]);
  const isTemporaryComponent = componentToAdd.get('isTemporary');
  const componentToAddSchema = componentToAdd.getIn(['schema', 'attributes']);
  const hasComponentAlreadyBeenAdded =
    state.getIn(['modifiedData', 'components', componentToAddUid]) !== undefined;

  // created components are already in the modifiedData.components
  // We don't add them because all modifications will be lost
  if (isTemporaryComponent || hasComponentAlreadyBeenAdded) {
    return newObj;
  }

  // Add the added components to the modifiedData.compontnes
  newObj = newObj.set(componentToAddUid, componentToAdd);
  const nestedComponents = retrieveComponentsFromSchema(
    componentToAddSchema.toJS(),
    state.get('components').toJS()
  );

  // We need to add the nested components to the modifiedData.components as well
  nestedComponents.forEach(componentUid => {
    const isTemporary = state.getIn(['components', componentUid, 'isTemporary']) || false;
    const hasNestedComponentAlreadyBeenAdded =
      state.getIn(['modifiedData', 'components', componentUid]) !== undefined;

    // Same logic here otherwise we will lose the modifications added to the components
    if (!isTemporary && !hasNestedComponentAlreadyBeenAdded) {
      newObj = newObj.set(componentUid, state.getIn(['components', componentUid]));
    }
  });

  return newObj;
};

const findAttributeIndex = (schema, attributeToFind) => {
  return schema.schema.attributes.findIndex(({ name }) => name === attributeToFind);
};

const reducer = (state = initialState, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case actions.ADD_CREATED_COMPONENT_TO_DYNAMIC_ZONE: {
        const { dynamicZoneTarget, componentsToAdd } = action;

        const dzAttributeIndex = findAttributeIndex(
          state.modifiedData.contentType,
          dynamicZoneTarget
        );

        componentsToAdd.forEach(componentUid => {
          draftState.modifiedData.contentType.schema.attributes[dzAttributeIndex].components.push(
            componentUid
          );
        });

        break;
      }
      case actions.CANCEL_CHANGES: {
        draftState.modifiedData = state.initialData;
        draftState.components = state.initialComponents;

        break;
      }
      case actions.CHANGE_DYNAMIC_ZONE_COMPONENTS: {
        const { dynamicZoneTarget, newComponents } = action;

        const dzAttributeIndex = findAttributeIndex(
          state.modifiedData.contentType,
          dynamicZoneTarget
        );

        const currentDZComponents =
          state.modifiedData.contentType.schema.attributes[dzAttributeIndex].components;

        const updatedComponents = makeUnique([...currentDZComponents, ...newComponents]);

        draftState.modifiedData.contentType.schema.attributes[
          dzAttributeIndex
        ].components = updatedComponents;

        // Retrieve all the components that needs to be added to the modifiedData.components
        // TODO check if it works
        const nestedComponents = retrieveComponentsFromSchema(
          current(draftState.modifiedData.contentType.schema.attributes),
          state.components
        );

        // We dont' need to set the already added components otherwise all modifications will be lost so we need to only add the not modified ones
        const nestedComponentsToAddInModifiedData = nestedComponents.filter(compoUID => {
          return get(state, ['modifiedData', 'components', compoUID]) === undefined;
        });

        nestedComponentsToAddInModifiedData.forEach(compoUID => {
          const compoSchema = get(state, ['components', compoUID], {});
          const isTemporary = compoSchema.isTemporary || false;

          // If the nested component has not been saved we don't need to add them as they are already in the state
          if (!isTemporary) {
            draftState.modifiedData.components[compoUID] = compoSchema;
          }
        });

        break;
      }

      case actions.CREATE_COMPONENT_SCHEMA: {
        const newSchema = {
          uid: action.uid,
          isTemporary: true,
          category: action.componentCategory,
          schema: {
            ...action.data,
            attributes: [],
          },
        };

        draftState.components[action.uid] = newSchema;

        if (action.shouldAddComponentToData) {
          draftState.modifiedData.components[action.uid] = newSchema;
        }

        break;
      }
      case actions.CREATE_SCHEMA: {
        const newSchema = {
          uid: action.uid,
          isTemporary: true,
          schema: {
            ...action.data,
            attributes: [],
          },
        };

        draftState.contentTypes[action.uid] = newSchema;

        break;
      }
      case actions.GET_DATA_SUCCEEDED: {
        draftState.components = action.components;
        draftState.initialComponents = action.components;
        draftState.initialContentTypes = action.contentTypes;
        draftState.contentTypes = action.contentTypes;
        draftState.reservedNames = action.reservedNames;
        draftState.isLoading = false;

        break;
      }
      case actions.DELETE_NOT_SAVED_TYPE: {
        // Doing so will also reset the modified and the initial data
        draftState.contentTypes = state.initialContentTypes;
        draftState.components = state.initialComponents;

        break;
      }
      case actions.RELOAD_PLUGIN: {
        return initialState;
      }
      case actions.SET_MODIFIED_DATA: {
        draftState.isLoadingForDataToBeSet = false;
        draftState.initialData = action.schemaToSet;
        draftState.modifiedData = action.schemaToSet;

        // Reset the state with the initial data
        // All created components and content types will be lost
        if (!action.hasJustCreatedSchema) {
          draftState.components = state.initialComponents;
          draftState.contentTypes = state.initialContentTypes;
        }

        break;
      }

      case actions.REMOVE_COMPONENT_FROM_DYNAMIC_ZONE: {
        const dzAttributeIndex = findAttributeIndex(state.modifiedData.contentType, action.dzName);

        draftState.modifiedData.contentType.schema.attributes[dzAttributeIndex].components.splice(
          action.componentToRemoveIndex,
          1
        );

        break;
      }
      case actions.REMOVE_FIELD: {
        const { mainDataKey, attributeToRemoveName } = action;
        const pathToAttributes = ['modifiedData', mainDataKey, 'schema', 'attributes'];
        const attributeToRemoveIndex = findAttributeIndex(
          state.modifiedData[mainDataKey],
          attributeToRemoveName
        );

        const pathToAttributeToRemove = [...pathToAttributes, attributeToRemoveIndex];
        const attributeToRemoveData = get(state, pathToAttributeToRemove);
        const isRemovingRelationAttribute = attributeToRemoveData.type === 'relation';
        // Only content types can have relations with themselves since
        // components can only have oneWay or manyWay relations
        const canTheAttributeToRemoveHaveARelationWithItself = mainDataKey === 'contentType';

        if (isRemovingRelationAttribute && canTheAttributeToRemoveHaveARelationWithItself) {
          const { target, relation, targetAttribute } = attributeToRemoveData;
          const relationType = getRelationType(relation, targetAttribute);

          const uid = state.modifiedData.contentType.uid;
          const shouldRemoveOppositeAttribute =
            target === uid && !ONE_SIDE_RELATIONS.includes(relationType);

          if (shouldRemoveOppositeAttribute) {
            const attributes = state.modifiedData[mainDataKey].schema.attributes.slice();
            const nextAttributes = attributes.filter(attribute => {
              if (attribute.name === attributeToRemoveName) {
                return false;
              }

              if (attribute.target === uid && attribute.targetAttribute === attributeToRemoveName) {
                return false;
              }

              return true;
            });

            draftState.modifiedData[mainDataKey].schema.attributes = nextAttributes;

            break;
          }
        }

        // Find all uid fields that have the targetField set to the field we are removing
        const uidFieldsToUpdate = state.modifiedData[mainDataKey].schema.attributes
          .slice()
          .reduce((acc, current) => {
            if (current.type !== 'uid') {
              return acc;
            }

            if (current.targetField !== attributeToRemoveName) {
              return acc;
            }

            acc.push(current.name);

            return acc;
          }, []);

        uidFieldsToUpdate.forEach(fieldName => {
          const fieldIndex = findAttributeIndex(state.modifiedData[mainDataKey], fieldName);

          delete draftState.modifiedData[mainDataKey].schema.attributes[fieldIndex].targetField;
        });

        draftState.modifiedData[mainDataKey].schema.attributes.splice(attributeToRemoveIndex, 1);

        break;
      }
      case actions.REMOVE_FIELD_FROM_DISPLAYED_COMPONENT: {
        const { attributeToRemoveName, componentUid } = action;

        const attributeToRemoveIndex = findAttributeIndex(
          state.modifiedData.components[componentUid],
          attributeToRemoveName
        );

        draftState.modifiedData.components[componentUid].schema.attributes.splice(
          attributeToRemoveIndex,
          1
        );

        break;
      }
      case actions.UPDATE_SCHEMA: {
        const {
          data: { name, collectionName, category, icon, kind },
          schemaType,
          uid,
        } = action;

        draftState.modifiedData[schemaType].schema.collectionName = collectionName;
        draftState.modifiedData[schemaType].schema.name = name;

        if (action.schemaType === 'component') {
          draftState.modifiedData.component.category = category;
          draftState.modifiedData.component.schema.icon = icon;
          const addedComponent = current(draftState.modifiedData.component);
          draftState.components[uid] = addedComponent;

          break;
        }

        draftState.modifiedData.contentType.schema.kind = kind;

        break;
      }
      default:
        return draftState;
    }
  });

// const reducer = (state = initialState, action) => {
//   switch (action.type) {
//     case actions.ADD_ATTRIBUTE: {
//       const {
//         attributeToSet: { name, ...rest },
//         forTarget,
//         targetUid,
//       } = action;
//       delete rest.createComponent;

//       const pathToDataToEdit = ['component', 'contentType'].includes(forTarget)
//         ? [forTarget]
//         : [forTarget, targetUid];

//       return state
//         .updateIn(['modifiedData', ...pathToDataToEdit, 'schema', 'attributes', name], () => {
//           return fromJS(rest);
//         })
//         .updateIn(['modifiedData', ...pathToDataToEdit, 'schema', 'attributes'], obj => {
//           const type = rest.type;
//           const target = get(rest, 'target', null);
//           const targetAttribute = get(rest, 'targetAttribute', null);
//           const relation = get(rest, 'relation', null);
//           const relationType = getRelationType(relation, targetAttribute);
//           const currentUid = state.getIn(['modifiedData', ...pathToDataToEdit, 'uid']);

//           // When the user in creating a relation with the same content type we need to create another attribute
//           // that is the opposite of the created one
//           if (
//             type === 'relation' &&
//             relationType !== 'oneWay' &&
//             relationType !== 'manyWay' &&
//             target === currentUid
//           ) {
//             const oppositeAttribute = {
//               relation: getOppositeRelation(relationType),
//               target,
//               targetAttribute: name,
//               type: 'relation',
//             };

//             if (rest.private) {
//               oppositeAttribute.private = rest.private;
//             }

//             return obj.update(rest.targetAttribute, () => {
//               return fromJS(oppositeAttribute);
//             });
//           }

//           return obj;
//         })
//         .updateIn(['modifiedData', 'components'], existingCompos => {
//           if (action.shouldAddComponentToData) {
//             return addComponentsToState(state, rest.component, existingCompos);
//           }

//           return existingCompos;
//         });
//     }

//     case actions.EDIT_ATTRIBUTE: {
//       const {
//         attributeToSet: { name, ...rest },
//         forTarget,
//         targetUid,
//         initialAttribute,
//       } = action;
//       let newState = state;

//       const initialAttributeName = get(initialAttribute, ['name'], '');
//       const pathToDataToEdit = ['component', 'contentType'].includes(forTarget)
//         ? [forTarget]
//         : [forTarget, targetUid];

//       return newState.updateIn(['modifiedData', ...pathToDataToEdit, 'schema'], obj => {
//         let oppositeAttributeNameToRemove = null;
//         let oppositeAttributeNameToUpdate = null;
//         let oppositeAttributeNameToCreateBecauseOfRelationTypeChange = null;
//         let oppositeAttributeToCreate = null;

//         const newObj = OrderedMap(
//           obj
//             .get('attributes')
//             .keySeq()
//             .reduce((acc, current) => {
//               const isEditingCurrentAttribute = current === initialAttributeName;

//               if (isEditingCurrentAttribute) {
//                 const currentUid = state.getIn(['modifiedData', ...pathToDataToEdit, 'uid']);
//                 const isEditingRelation = initialAttribute.type === 'relation';
//                 const didChangeTargetRelation = initialAttribute.target !== rest.target;
//                 const didCreateInternalRelation = rest.target === currentUid;
//                 const relationType = getRelationType(rest.relation, rest.targetAttribute);
//                 const initialRelationType = getRelationType(
//                   initialAttribute.relation,
//                   initialAttribute.targetAttribute
//                 );
//                 const hadInternalRelation = initialAttribute.target === currentUid;
//                 const didChangeRelationType = initialRelationType !== relationType;
//                 const shouldRemoveOppositeAttributeBecauseOfTargetChange =
//                   didChangeTargetRelation &&
//                   !didCreateInternalRelation &&
//                   hadInternalRelation &&
//                   isEditingRelation;
//                 const shouldRemoveOppositeAttributeBecauseOfRelationTypeChange =
//                   didChangeRelationType &&
//                   hadInternalRelation &&
//                   ['oneWay', 'manyWay'].includes(relationType) &&
//                   isEditingRelation;
//                 const shouldUpdateOppositeAttributeBecauseOfRelationTypeChange =
//                   !ONE_SIDE_RELATIONS.includes(initialRelationType) &&
//                   !ONE_SIDE_RELATIONS.includes(relationType) &&
//                   hadInternalRelation &&
//                   didCreateInternalRelation &&
//                   isEditingRelation;
//                 const shouldCreateOppositeAttributeBecauseOfRelationTypeChange =
//                   ONE_SIDE_RELATIONS.includes(initialRelationType) &&
//                   !ONE_SIDE_RELATIONS.includes(relationType) &&
//                   hadInternalRelation &&
//                   didCreateInternalRelation &&
//                   isEditingRelation;
//                 const shouldCreateOppositeAttributeBecauseOfTargetChange =
//                   didChangeTargetRelation &&
//                   didCreateInternalRelation &&
//                   !ONE_SIDE_RELATIONS.includes(relationType);

//                 // Update the opposite attribute name so it is removed at the end of the loop
//                 if (
//                   shouldRemoveOppositeAttributeBecauseOfTargetChange ||
//                   shouldRemoveOppositeAttributeBecauseOfRelationTypeChange
//                 ) {
//                   oppositeAttributeNameToRemove = initialAttribute.targetAttribute;
//                 }

//                 // Set the opposite attribute that will be updated when the loop attribute matches the name
//                 if (
//                   shouldUpdateOppositeAttributeBecauseOfRelationTypeChange ||
//                   shouldCreateOppositeAttributeBecauseOfRelationTypeChange ||
//                   shouldCreateOppositeAttributeBecauseOfTargetChange
//                 ) {
//                   oppositeAttributeNameToUpdate = initialAttribute.targetAttribute;
//                   oppositeAttributeNameToCreateBecauseOfRelationTypeChange = rest.targetAttribute;

//                   oppositeAttributeToCreate = {
//                     relation: getOppositeRelation(relationType),
//                     target: rest.target,
//                     targetAttribute: name,
//                     type: 'relation',
//                   };

//                   if (rest.private) {
//                     oppositeAttributeToCreate.private = rest.private;
//                   }

//                   // TODO check if we can erase the previous relation attribute
//                   // acc[name] = fromJS(rest);
//                   // First update the current attribute with the value
//                   const toSet = {
//                     relation: rest.relation,
//                     target: rest.target,
//                     targetAttribute: rest.targetAttribute,
//                     type: 'relation',
//                   };

//                   if (rest.private) {
//                     toSet.private = rest.private;
//                   }

//                   acc[name] = fromJS(toSet);

//                   // Then (if needed) create the opposite attribute the case is changing the relation from
//                   // We do it here so keep the order of the attributes
//                   // oneWay || manyWay to something another relation
//                   if (
//                     shouldCreateOppositeAttributeBecauseOfRelationTypeChange ||
//                     shouldCreateOppositeAttributeBecauseOfTargetChange
//                   ) {
//                     acc[oppositeAttributeNameToCreateBecauseOfRelationTypeChange] = fromJS(
//                       oppositeAttributeToCreate
//                     );

//                     oppositeAttributeToCreate = null;
//                     oppositeAttributeNameToCreateBecauseOfRelationTypeChange = null;
//                   }

//                   return acc;
//                 }

//                 acc[name] = fromJS(rest);
//               } else if (current === oppositeAttributeNameToUpdate) {
//                 acc[oppositeAttributeNameToCreateBecauseOfRelationTypeChange] = fromJS(
//                   oppositeAttributeToCreate
//                 );
//               } else {
//                 acc[current] = obj.getIn(['attributes', current]);
//               }

//               return acc;
//             }, {})
//         );

//         let updatedObj;

//         // Remove the opposite attribute
//         if (oppositeAttributeNameToRemove !== null) {
//           updatedObj = newObj.remove(oppositeAttributeNameToRemove);
//         } else {
//           updatedObj = newObj;
//         }

//         return obj.set('attributes', updatedObj);
//       });
//     }

//

//     default:
//       return state;
//   }
// };

export default reducer;
export { addComponentsToState, initialState };
