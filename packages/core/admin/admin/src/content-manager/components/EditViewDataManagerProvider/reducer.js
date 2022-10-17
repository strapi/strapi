import produce from 'immer';
import unset from 'lodash/unset';
import get from 'lodash/get';
import set from 'lodash/set';
import take from 'lodash/take';
import { moveFields } from './utils';
import { getMaxTempKey } from '../../utils';

const initialState = {
  componentsDataStructure: {},
  contentTypeDataStructure: {},
  formErrors: {},
  initialData: {},
  modifiedData: null,
  shouldCheckErrors: false,
  modifiedDZName: null,
  publishConfirmation: {
    show: false,
    draftCount: 0,
  },
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case 'ADD_NON_REPEATABLE_COMPONENT_TO_FIELD': {
        set(
          draftState,
          ['modifiedData', ...action.keys],
          state.componentsDataStructure[action.componentUid]
        );

        break;
      }
      case 'ADD_REPEATABLE_COMPONENT_TO_FIELD': {
        let currentValue = get(state, ['modifiedData', ...action.keys], []).slice();

        const defaultDataStructure = {
          ...state.componentsDataStructure[action.componentUid],
          __temp_key__: getMaxTempKey(currentValue) + 1,
        };

        if (Array.isArray(currentValue)) {
          currentValue.push(defaultDataStructure);
        } else {
          currentValue = [defaultDataStructure];
        }

        set(draftState, ['modifiedData', ...action.keys], currentValue);

        if (action.shouldCheckErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        break;
      }
      case 'ADD_COMPONENT_TO_DYNAMIC_ZONE': {
        draftState.modifiedDZName = action.keys[0];

        if (action.shouldCheckErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        const defaultDataStructure = {
          ...state.componentsDataStructure[action.componentUid],
          __component: action.componentUid,
        };

        const currentValue = get(state, ['modifiedData', ...action.keys], null);
        const updatedValue = currentValue
          ? [...currentValue, defaultDataStructure]
          : [defaultDataStructure];

        set(draftState, ['modifiedData', ...action.keys], updatedValue);

        break;
      }
      case 'LOAD_RELATION': {
        const initialDataPath = ['initialData', ...action.keys];
        const modifiedDataPath = ['modifiedData', ...action.keys];
        const { value } = action;

        const initialDataRelations = get(state, initialDataPath);
        const modifiedDataRelations = get(state, modifiedDataPath);

        set(draftState, initialDataPath, [...value, ...initialDataRelations]);

        /**
         * We need to set the value also on modifiedData, because initialData
         * and modifiedData need to stay in sync, so that the CM can compare
         * both states, to render the dirty UI state
         */

        set(draftState, modifiedDataPath, [...value, ...modifiedDataRelations]);

        break;
      }
      case 'CONNECT_RELATION': {
        const path = ['modifiedData', ...action.keys];
        const { value } = action;

        const modifiedDataRelations = get(state, path);
        const newRelations = [...modifiedDataRelations, value];
        set(draftState, path, newRelations);

        // const connectedRelations = get(state, [...path, 'connect']);
        // const disconnectedRelations = get(state, [...path, 'disconnect']) ?? [];
        // const savedRelations = get(state, [...path, 'results']) ?? [];
        // const existInSavedRelation =
        //   savedRelations?.findIndex((savedRelations) => savedRelations.id === value.id) !== -1;

        // if (!connectedRelations) {
        //   set(draftState, [...path, 'connect'], []);
        // }

        // // We should add a relation in the connect array only if it is not an already saved relation
        // if (!existInSavedRelation) {
        //   if (replace) {
        //     set(draftState, [...path, 'connect'], [value]);
        //   } else {
        //     const nextValue = get(draftState, [...path, 'connect']);
        //     nextValue.push(value);
        //   }
        // }

        // // Disconnect array handling
        // if (replace) {
        //   // In xToOne relations we should place the saved relation in disconnected array to not display it
        //   // only needed if there is a saved relation and it is not already stored in disconnected array
        //   if (savedRelations.length && !disconnectedRelations.length) {
        //     set(draftState, [...path, 'disconnect'], savedRelations);
        //   }

        //   // If the saved relation is stored in disconnected array
        //   // We should remove it when an action requires to reconnect this relation
        //   // We then reset the connect/disconnect state
        //   if (disconnectedRelations.length) {
        //     const existsInDisconnectedRelations =
        //       disconnectedRelations.findIndex(
        //         (disconnectedRelation) => disconnectedRelation?.id === value.id
        //       ) > -1;

        //     if (existsInDisconnectedRelations) {
        //       set(draftState, [...path, 'disconnect'], []);
        //       set(draftState, [...path, 'connect'], []);
        //     }
        //   }
        // } else if (disconnectedRelations.length) {
        //   // In xToMany relations, when an action requires to connect a relation
        //   // We should remove it from the disconnected array if it existed in it
        //   const existsInDisconnect = disconnectedRelations.find(
        //     (disconnectValue) => disconnectValue.id === value.id
        //   );

        //   if (existsInDisconnect) {
        //     const newDisconnectArray = pull([...disconnectedRelations], existsInDisconnect);
        //     set(draftState, [...path, 'disconnect'], newDisconnectArray);
        //   }
        // }

        break;
      }
      case 'DISCONNECT_RELATION': {
        const path = ['modifiedData', ...action.keys];
        const { id } = action;
        const modifiedDataRelation = get(state, [...path]);

        /**
         * TODO: before merge make this performant (e.g. 1000 relations === long time)
         */
        const newRelations = modifiedDataRelation.filter((rel) => rel.id !== id);

        set(draftState, path, newRelations);

        // const connectedRelations = get(state, [...path, 'connect']);
        // const disconnectedRelations = get(state, [...path, 'disconnect']);

        // if (!disconnectedRelations) {
        //   set(draftState, [...path, 'disconnect'], []);
        // }

        // const nextValue = get(draftState, [...path, 'disconnect']);
        // nextValue.push(value);

        // if (connectedRelations?.length) {
        //   const existsInConnect = connectedRelations.find(
        //     (connectValue) => connectValue.id === value.id
        //   );

        //   if (existsInConnect) {
        //     const newConnectArray = pull([...connectedRelations], existsInConnect);
        //     set(draftState, [...path, 'connect'], newConnectArray);
        //   }
        // }

        break;
      }
      case 'INIT_FORM': {
        const { initialValues, relationalFields = [] } = action;

        // TODO: initialValues shouldn't hold any value for relational fields?
        // relation should only holds an array which will be populated in RelationInputDataManager component
        // count can be deduced from pagination.total there

        // const moBis = {
        //   ...relationalFields.reduce((acc, name) => {
        //     const { connect, disconnect, ...currentState } = state.modifiedData?.[name] ?? {};

        //     acc[name] = {
        //       ...(currentState ?? {}),
        //     };

        //     return acc;
        //   }, {}),
        // };

        draftState.formErrors = {};

        draftState.initialData = {
          ...initialValues,

          /**
           * The state we keep in the client for relations looks like:
           *
           * {
           *   count: <int>
           *   results: [<Relation>]
           * }
           *
           * The content API only returns { count: <int> }, which is why
           * we need to extend the existing state rather than overwriting it.
           */

          ...relationalFields.reduce((acc, name) => {
            acc[name] = [...(state.initialData?.[name] ?? [])];

            return acc;
          }, {}),
        };

        draftState.modifiedData = {
          ...initialValues,

          /**
           * The client sends the following to the content API:
           *
           * {
           *   connect: [<Relation>],
           *   disconnect: [<Relation>]
           * }
           *
           * but receives only { count: <int> } in return. After save/ publish
           * we have to:
           *
           * 1) reset the connect/ disconnect arrays
           * 2) extend the existing state with the API response, so that `count`
           *    stays in sync
           */

          ...relationalFields.reduce((acc, name) => {
            acc[name] = [...(state.initialData?.[name] ?? [])];

            return acc;
          }, {}),
        };

        draftState.modifiedDZName = null;
        draftState.shouldCheckErrors = false;
        break;
      }
      case 'MOVE_COMPONENT_FIELD': {
        const currentValue = get(state, ['modifiedData', ...action.pathToComponent]);
        const valueToInsert = get(state, [
          'modifiedData',
          ...action.pathToComponent,
          action.dragIndex,
        ]);

        const updatedValue = moveFields(
          currentValue,
          action.dragIndex,
          action.hoverIndex,
          valueToInsert
        );

        set(draftState, ['modifiedData', ...action.pathToComponent], updatedValue);

        break;
      }
      case 'MOVE_COMPONENT_UP':
      case 'MOVE_COMPONENT_DOWN': {
        const { currentIndex, dynamicZoneName, shouldCheckErrors } = action;

        if (shouldCheckErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        const currentValue = state.modifiedData[dynamicZoneName];
        const nextIndex = action.type === 'MOVE_COMPONENT_UP' ? currentIndex - 1 : currentIndex + 1;
        const valueToInsert = state.modifiedData[dynamicZoneName][currentIndex];
        const updatedValue = moveFields(currentValue, currentIndex, nextIndex, valueToInsert);

        set(draftState, ['modifiedData', action.dynamicZoneName], updatedValue);

        break;
      }
      case 'MOVE_FIELD': {
        const currentValue = get(state, ['modifiedData', ...action.keys], []).slice();
        const valueToInsert = get(state, ['modifiedData', ...action.keys, action.dragIndex]);
        const updatedValue = moveFields(
          currentValue,
          action.dragIndex,
          action.overIndex,
          valueToInsert
        );

        set(draftState, ['modifiedData', ...action.keys], updatedValue);

        break;
      }
      case 'ON_CHANGE': {
        const [nonRepeatableComponentKey] = action.keys;

        // This is used to set the initialData for inputs
        // that needs an asynchronous initial value like the UID field
        // This is just a temporary patch.
        // TODO : Refactor the default form creation (workflow) to accept async default values.
        if (action.shouldSetInitialValue) {
          set(draftState, ['initialData', ...action.keys], action.value);
        }

        // FIXME: not sure this is needed...
        if (
          action.keys.length === 2 &&
          get(state, ['modifiedData', nonRepeatableComponentKey]) === null
        ) {
          set(draftState, ['modifiedData', nonRepeatableComponentKey], {
            [action.keys[1]]: action.value,
          });

          break;
        }

        set(draftState, ['modifiedData', ...action.keys], action.value);

        break;
      }
      case 'REMOVE_COMPONENT_FROM_DYNAMIC_ZONE': {
        if (action.shouldCheckErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        draftState.modifiedData[action.dynamicZoneName].splice(action.index, 1);

        break;
      }
      case 'REMOVE_COMPONENT_FROM_FIELD': {
        const componentPathToRemove = ['modifiedData', ...action.keys];

        set(draftState, componentPathToRemove, null);

        break;
      }
      case 'REMOVE_PASSWORD_FIELD': {
        unset(draftState, ['modifiedData', ...action.keys]);

        break;
      }
      case 'REMOVE_REPEATABLE_FIELD': {
        const keysLength = action.keys.length - 1;
        const pathToComponentData = ['modifiedData', ...take(action.keys, keysLength)];
        const hasErrors = Object.keys(state.formErrors).length > 0;

        if (hasErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        const currentValue = get(state, pathToComponentData).slice();
        currentValue.splice(parseInt(action.keys[keysLength], 10), 1);

        set(draftState, pathToComponentData, currentValue);

        break;
      }
      case 'SET_DEFAULT_DATA_STRUCTURES': {
        draftState.componentsDataStructure = action.componentsDataStructure;
        draftState.contentTypeDataStructure = action.contentTypeDataStructure;

        break;
      }
      case 'SET_FORM_ERRORS': {
        draftState.modifiedDZName = null;
        draftState.formErrors = action.errors;
        break;
      }
      case 'TRIGGER_FORM_VALIDATION': {
        const hasErrors = Object.keys(state.formErrors).length > 0;

        if (hasErrors) {
          draftState.shouldCheckErrors = !state.shouldCheckErrors;
        }

        break;
      }
      case 'SET_PUBLISH_CONFIRMATION': {
        draftState.publishConfirmation = { ...action.publishConfirmation };
        break;
      }
      case 'RESET_PUBLISH_CONFIRMATION': {
        draftState.publishConfirmation = { ...state.publishConfirmation, show: false };
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
