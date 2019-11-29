import { fromJS, OrderedMap } from 'immutable';
import { get, has } from 'lodash';
import makeUnique from './utils/makeUnique';

const initialState = fromJS({
  components: {},
  contentTypes: {},
  initialComponents: {},
  intialContentTypes: {},
  initialData: {},
  modifiedData: {},
  isLoading: true,
  isLoadingForDataToBeSet: true,
});

const ONE_SIDE_RELATIONS = ['oneWay', 'manyWay'];
const getOppositeNature = originalNature => {
  if (originalNature === 'manyToOne') {
    return 'oneToMany';
  } else if (originalNature === 'oneToMany') {
    return 'manyToOne';
  } else {
    return originalNature;
  }
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ATTRIBUTE': {
      const {
        attributeToSet: { name, ...rest },
        forTarget,
        targetUid,
      } = action;
      delete rest.createComponent;

      const pathToDataToEdit = ['component', 'contentType'].includes(forTarget)
        ? [forTarget]
        : [forTarget, targetUid];

      return state
        .updateIn(
          ['modifiedData', ...pathToDataToEdit, 'schema', 'attributes', name],
          () => {
            return fromJS(rest);
          }
        )
        .updateIn(
          ['modifiedData', ...pathToDataToEdit, 'schema', 'attributes'],
          obj => {
            const type = get(rest, 'type', 'relation');
            const target = get(rest, 'target', null);
            const nature = get(rest, 'nature', null);
            const currentUid = state.getIn([
              'modifiedData',
              ...pathToDataToEdit,
              'uid',
            ]);

            // When the user in creating a relation with the same content type we need to create another attribute
            // that is the opposite of the created one
            if (
              type === 'relation' &&
              nature !== 'oneWay' &&
              nature !== 'manyWay' &&
              target === currentUid
            ) {
              const oppositeAttribute = {
                nature: getOppositeNature(nature),
                target,
                unique: rest.unique,
                required: rest.required,
                dominant: nature === 'manyToMany' ? !rest.dominant : null,
                targetAttribute: name,
                columnName: rest.targetColumnName,
                targetColumnName: rest.columnName,
              };

              return obj.update(rest.targetAttribute, () => {
                return fromJS(oppositeAttribute);
              });
            }

            return obj;
          }
        )
        .updateIn(['modifiedData', 'components'], existingCompos => {
          if (action.shouldAddComponentToData) {
            const componentToAdd = state.getIn(['components', rest.component]);

            return existingCompos.update(
              componentToAdd.get('uid'),
              () => componentToAdd
            );
          }

          return existingCompos;
        });
    }
    case 'ADD_CREATED_COMPONENT_TO_DYNAMIC_ZONE': {
      const { dynamicZoneTarget, componentsToAdd } = action;

      return state.updateIn(
        [
          'modifiedData',
          'contentType',
          'schema',
          'attributes',
          dynamicZoneTarget,
          'components',
        ],
        list => {
          return list.concat(componentsToAdd);
        }
      );
    }
    case 'CHANGE_DYNAMIC_ZONE_COMPONENTS': {
      const { dynamicZoneTarget, newComponents } = action;

      return state
        .updateIn(
          [
            'modifiedData',
            'contentType',
            'schema',
            'attributes',
            dynamicZoneTarget,
            'components',
          ],
          () => fromJS(makeUnique(newComponents))
        )
        .updateIn(['modifiedData', 'components'], old => {
          const componentsSchema = newComponents.reduce((acc, current) => {
            const addedCompoSchema = state.getIn(['components', current]);

            return acc.set(current, addedCompoSchema);
          }, old);

          return componentsSchema;
        });
    }

    case 'CREATE_SCHEMA': {
      const newSchema = {
        uid: action.uid,
        isTemporary: true,
        schema: {
          ...action.data,
          attributes: {},
        },
      };

      return state.updateIn(['contentTypes', action.uid], () =>
        fromJS(newSchema)
      );
    }
    case 'CREATE_COMPONENT_SCHEMA': {
      const newSchema = {
        uid: action.uid,
        isTemporary: true,
        category: action.componentCategory,
        schema: {
          ...action.data,
          attributes: {},
        },
      };

      if (action.shouldAddComponentToData) {
        return state
          .updateIn(['components', action.uid], () => fromJS(newSchema))
          .updateIn(['modifiedData', 'components', action.uid], () =>
            fromJS(newSchema)
          );
      }

      return state.updateIn(['components', action.uid], () =>
        fromJS(newSchema)
      );
    }
    case 'EDIT_ATTRIBUTE': {
      const {
        attributeToSet: { name, ...rest },
        forTarget,
        targetUid,
        initialAttribute,
      } = action;
      let newState = state;
      const initialAttributeName = get(initialAttribute, ['name'], '');
      const pathToDataToEdit = ['component', 'contentType'].includes(forTarget)
        ? [forTarget]
        : [forTarget, targetUid];

      const isEditingComponentAttribute = rest.type === 'component';

      if (isEditingComponentAttribute) {
        newState = state.updateIn(
          ['modifiedData', 'components', rest.component],
          () => state.getIn(['components', rest.component])
        );
      }

      return newState.updateIn(
        ['modifiedData', ...pathToDataToEdit, 'schema'],
        obj => {
          let oppositeAttributeNameToRemove = null;
          let oppositeAttributeNameToUpdate = null;
          let oppositeAttributeNameToCreateBecauseOfNatureChange = null;
          let oppositeAttributeToCreate = null;

          const newObj = OrderedMap(
            obj
              .get('attributes')
              .keySeq()
              .reduce((acc, current) => {
                const isEditingCurrentAttribute =
                  current === initialAttributeName;

                if (isEditingCurrentAttribute) {
                  const currentUid = state.getIn([
                    'modifiedData',
                    ...pathToDataToEdit,
                    'uid',
                  ]);
                  const isEditingRelation = has(initialAttribute, 'nature');
                  const didChangeTargetRelation =
                    initialAttribute.target !== rest.target;
                  const didCreateInternalRelation = rest.target === currentUid;
                  const nature = rest.nature;
                  const initialNature = initialAttribute.nature;
                  const hadInternalRelation =
                    initialAttribute.target === currentUid;
                  const didChangeRelationNature =
                    initialAttribute.nature !== nature;
                  const shouldRemoveOppositeAttributeBecauseOfTargetChange =
                    didChangeTargetRelation &&
                    !didCreateInternalRelation &&
                    hadInternalRelation &&
                    isEditingRelation;
                  const shouldRemoveOppositeAttributeBecauseOfNatureChange =
                    didChangeRelationNature &&
                    hadInternalRelation &&
                    ['oneWay', 'manyWay'].includes(nature) &&
                    isEditingRelation;
                  const shouldUpdateOppositeAttributeBecauseOfNatureChange =
                    !ONE_SIDE_RELATIONS.includes(initialNature) &&
                    !ONE_SIDE_RELATIONS.includes(nature) &&
                    hadInternalRelation &&
                    didCreateInternalRelation &&
                    isEditingRelation;
                  const shouldCreateOppositeAttributeBecauseOfNatureChange =
                    ONE_SIDE_RELATIONS.includes(initialNature) &&
                    !ONE_SIDE_RELATIONS.includes(nature) &&
                    hadInternalRelation &&
                    didCreateInternalRelation &&
                    isEditingRelation;

                  // Update the opposite attribute name so it is removed at the end of the loop
                  if (
                    shouldRemoveOppositeAttributeBecauseOfTargetChange ||
                    shouldRemoveOppositeAttributeBecauseOfNatureChange
                  ) {
                    oppositeAttributeNameToRemove =
                      initialAttribute.targetAttribute;
                  }

                  // Set the opposite attribute that will be updated when the loop attribute matches the name
                  if (
                    shouldUpdateOppositeAttributeBecauseOfNatureChange ||
                    shouldCreateOppositeAttributeBecauseOfNatureChange
                  ) {
                    oppositeAttributeNameToUpdate =
                      initialAttribute.targetAttribute;
                    oppositeAttributeNameToCreateBecauseOfNatureChange =
                      rest.targetAttribute;

                    oppositeAttributeToCreate = {
                      nature: getOppositeNature(rest.nature),
                      target: rest.target,
                      unique: rest.unique,
                      required: rest.required,
                      dominant:
                        rest.nature === 'manyToMany' ? !rest.dominant : null,
                      targetAttribute: name,
                      columnName: rest.targetColumnName,
                      targetColumnName: rest.columnName,
                    };

                    // First update the current attribute with the value
                    acc[name] = fromJS(rest);

                    // Then (if needed) create the opposite attribute the case is changing the relation from
                    // We do it here so keep the order of the attributes
                    // oneWay || manyWay to something another relation
                    if (shouldCreateOppositeAttributeBecauseOfNatureChange) {
                      acc[
                        oppositeAttributeNameToCreateBecauseOfNatureChange
                      ] = fromJS(oppositeAttributeToCreate);

                      oppositeAttributeToCreate = null;
                      oppositeAttributeNameToCreateBecauseOfNatureChange = null;
                    }

                    return acc;
                  }

                  acc[name] = fromJS(rest);
                } else if (current === oppositeAttributeNameToUpdate) {
                  acc[
                    oppositeAttributeNameToCreateBecauseOfNatureChange
                  ] = fromJS(oppositeAttributeToCreate);
                } else {
                  acc[current] = obj.getIn(['attributes', current]);
                }

                return acc;
              }, {})
          );

          let updatedObj;

          // Remove the opposite attribute
          if (oppositeAttributeNameToRemove !== null) {
            updatedObj = newObj.remove(oppositeAttributeNameToRemove);
          } else {
            updatedObj = newObj;
          }

          return obj.set('attributes', updatedObj);
        }
      );
    }

    case 'GET_DATA_SUCCEEDED':
      return state
        .update('components', () => fromJS(action.components))
        .update('contentTypes', () => fromJS(action.contentTypes))
        .update('isLoading', () => false);
    case 'REMOVE_FIELD_FROM_DISPLAYED_COMPONENT': {
      const { attributeToRemoveName, componentUid } = action;

      return state.removeIn([
        'modifiedData',
        'components',
        componentUid,
        'schema',
        'attributes',
        attributeToRemoveName,
      ]);
    }
    case 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE':
      return state.removeIn([
        'modifiedData',
        'contentType',
        'schema',
        'attributes',
        action.dzName,
        'components',
        action.componentToRemoveIndex,
      ]);
    case 'REMOVE_FIELD': {
      const { mainDataKey, attributeToRemoveName } = action;
      const pathToAttributes = [
        'modifiedData',
        mainDataKey,
        'schema',
        'attributes',
      ];
      const pathToAttributeToRemove = [
        ...pathToAttributes,
        attributeToRemoveName,
      ];
      const attributeToRemoveData = state.getIn(pathToAttributeToRemove);
      const isRemovingRelationAttribute =
        attributeToRemoveData.get('nature') !== undefined;
      // Only content types can have relations that with themselves since
      // components can only have oneWay or manyWay relations
      const canTheAttributeToRemoveHaveARelationWithItself =
        mainDataKey === 'contentType';

      if (
        isRemovingRelationAttribute &&
        canTheAttributeToRemoveHaveARelationWithItself
      ) {
        const {
          target,
          nature,
          targetAttribute,
        } = attributeToRemoveData.toJS();
        const uid = state.getIn(['modifiedData', 'contentType', 'uid']);
        const shouldRemoveOppositeAttribute =
          target === uid && !ONE_SIDE_RELATIONS.includes(nature);

        if (shouldRemoveOppositeAttribute) {
          return state
            .removeIn(pathToAttributeToRemove)
            .removeIn([...pathToAttributes, targetAttribute]);
        }
      }

      return state.removeIn(pathToAttributeToRemove);
    }

    case 'SET_MODIFIED_DATA': {
      return state
        .update('isLoadingForDataToBeSet', () => false)
        .update('initialData', () => fromJS(action.schemaToSet))
        .update('modifiedData', () => fromJS(action.schemaToSet));
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
