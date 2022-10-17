import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';

/* eslint-disable indent */

/**
 *
 * @param {{ browserState: object, serverState: object }} browserState – the modifiedData from REDUX, serverStaet - the initialData from REDUX
 * @param {object} currentSchema
 * @param {object} componentsSchema
 * @returns
 */
const cleanData = ({ browserState, serverState }, currentSchema, componentsSchema) => {
  const getType = (schema, attrName) => get(schema, ['attributes', attrName, 'type'], '');
  const getOtherInfos = (schema, arr) => get(schema, ['attributes', ...arr], '');

  /**
   *
   * @param {object} browserState – the modifiedData from REDUX
   * @param {object} serverState – the initialData from REDUX
   * @param {*} schema
   * @returns
   */
  const recursiveCleanData = (browserState, serverState, schema) => {
    return Object.keys(browserState).reduce((acc, current) => {
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
              ? value.map((data) => {
                  const subCleanedData = recursiveCleanData(data, componentsSchema[component]);

                  return subCleanedData;
                })
              : value;
          } else {
            cleanedData = value ? recursiveCleanData(value, componentsSchema[component]) : value;
          }

          break;

        case 'relation': {
          /**
           * Instead of the full relation object, we only want to send its ID
           */
          const currentRelationIds = value.map((relation) => ({ id: relation.id }));
          const oldRelationsIds = oldValue.map((relation) => ({ id: relation.id }));

          /**
           * connectedRelations are the items that are in the browserState
           * array but not in the serverState
           */
          const connectedRelations = currentRelationIds.filter(
            (rel) => !oldRelationsIds.some((oldRel) => oldRel.id === rel.id)
          );

          /**
           * disconnectedRelations are the items that are in the serverState but
           * are no longer in the browserState
           */
          const disconnectedRelations = oldRelationsIds.filter(
            (rel) => !currentRelationIds.some((currRel) => currRel.id === rel.id)
          );

          cleanedData = {
            disconnect: disconnectedRelations,
            connect: connectedRelations,
          };

          break;
        }

        case 'dynamiczone':
          cleanedData = value.map((componentData) => {
            const subCleanedData = recursiveCleanData(
              componentData,
              componentsSchema[componentData.__component]
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

  return recursiveCleanData(browserState, serverState, currentSchema);
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
