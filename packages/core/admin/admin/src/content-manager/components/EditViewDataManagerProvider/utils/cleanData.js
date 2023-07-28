import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';

import { getInitialDataPathUsingTempKeys } from '../../../utils/paths';

/* eslint-disable indent */

/**
 *
 * @param {{ browserState: object, serverState: object }} browserState – the modifiedData from REDUX, serverState - the initialData from REDUX
 * @param {object} currentSchema
 * @param {object} componentsSchema
 * @returns
 */
const cleanData = ({ browserState, serverState }, currentSchema, componentsSchema) => {
  const rootServerState = serverState;
  const rootBrowserState = browserState;
  const getType = (schema, attrName) => get(schema, ['attributes', attrName, 'type'], '');
  const getOtherInfos = (schema, arr) => get(schema, ['attributes', ...arr], '');

  /**
   *
   * @param {object} browserState – the modifiedData from REDUX
   * @param {object} serverState – the initialData from REDUX
   * @param {*} schema
   * @param {string} pathToParent - the path to the parent of the current entry
   * @returns
   */
  const recursiveCleanData = (browserState, serverState, schema, pathToParent) => {
    return Object.keys(browserState).reduce((acc, current) => {
      const path = pathToParent ? `${pathToParent}.${current}` : current;
      const attrType = getType(schema, current);

      // This is the field value
      const value = get(browserState, current);
      const oldValue = get(serverState, current);
      const component = getOtherInfos(schema, [current, 'component']);
      const isRepeatable = getOtherInfos(schema, [current, 'repeatable']);
      let cleanedData;

      switch (attrType) {
        case 'json':
          cleanedData = JSON.parse(value);
          break;
        case 'time': {
          cleanedData = value;

          // FIXME
          if (value && value.split(':').length < 3) {
            cleanedData = `${value}:00`;
          }

          break;
        }
        case 'media':
          if (getOtherInfos(schema, [current, 'multiple']) === true) {
            cleanedData = value ? value.filter((file) => !(file instanceof File)) : null;
          } else {
            cleanedData = get(value, 0) instanceof File ? null : get(value, 'id', null);
          }
          break;
        case 'component':
          if (isRepeatable) {
            cleanedData = value
              ? value.map((data, index) => {
                  const subCleanedData = recursiveCleanData(
                    data,
                    (oldValue ?? [])[index],
                    componentsSchema[component],
                    `${path}.${index}`
                  );

                  return subCleanedData;
                })
              : value;
          } else {
            cleanedData = value
              ? recursiveCleanData(value, oldValue, componentsSchema[component], path)
              : value;
          }

          break;

        case 'relation': {
          const trueInitialDataPath = getInitialDataPathUsingTempKeys(
            rootServerState,
            rootBrowserState
          )(path).join('.');

          /**
           * Because of how repeatable components work when you dig into them the server
           * will have no object to compare too therefore no relation array will be setup
           * because the component has not been initialized, therefore we can safely assume
           * it needs to be added and provide a default empty array.
           */
          let actualOldValue = get(rootServerState, trueInitialDataPath, []);

          /**
           * Instead of the full relation object, we only want to send its ID
           *  connectedRelations are the items that are in the browserState
           * array but not in the serverState
           */
          const connectedRelations = value.reduce((acc, relation, currentIndex, array) => {
            const relationOnServer = actualOldValue.find(
              (oldRelation) => oldRelation.id === relation.id
            );

            const relationInFront = array[currentIndex + 1];

            if (!relationOnServer || relationOnServer.__temp_key__ !== relation.__temp_key__) {
              const position = relationInFront ? { before: relationInFront.id } : { end: true };

              return [...acc, { id: relation.id, position }];
            }

            return acc;
          }, []);

          /**
           * disconnectedRelations are the items that are in the serverState but
           * are no longer in the browserState
           */
          const disconnectedRelations = actualOldValue.reduce((acc, relation) => {
            if (!value.find((newRelation) => newRelation.id === relation.id)) {
              return [...acc, { id: relation.id }];
            }

            return acc;
          }, []);

          cleanedData = {
            disconnect: disconnectedRelations,
            /**
             * Reverse the array because the API sequentially goes through the list
             * so in an instance where you add two to the end it would fail because index0
             * would want to attach itself to index1 which doesn't exist yet.
             */
            connect: connectedRelations.reverse(),
          };

          break;
        }

        case 'dynamiczone':
          cleanedData = value.map((componentData, index) => {
            const subCleanedData = recursiveCleanData(
              componentData,
              (oldValue ?? [])[index],
              componentsSchema[componentData.__component],
              `${path}.${index}`
            );

            return subCleanedData;
          });
          break;
        default:
          cleanedData = helperCleanData(value, 'id');
      }

      acc[current] = cleanedData;

      return acc;
    }, {});
  };

  return recursiveCleanData(browserState, serverState, currentSchema, '');
};

// TODO: check which parts are still needed: I suspect the
// isArray part can go away, but I'm not sure what could send
// an object; in case both can go away we might be able to get
// rid of the whole helper
export const helperCleanData = (value, key) => {
  if (isArray(value)) {
    return value.map((obj) => (obj[key] ? obj[key] : obj));
  }
  if (isObject(value)) {
    return value[key];
  }

  return value;
};

export default cleanData;
