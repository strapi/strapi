import { get, has, isEmpty, isNil } from 'lodash';

const getDraftRelations = (data, ctSchema, components) => {
  const getDraftRelationsCount = (data, schema) =>
    Object.keys(data).reduce((acc, current) => {
      const type = get(schema, ['attributes', current, 'type'], 'string');
      const relationType = get(schema, ['attributes', current, 'relationType'], '');
      const isMorph = relationType.toLowerCase().includes('morph');
      const oneWayTypes = ['oneWay', 'oneToOne', 'manyToOne'];
      const currentData = data[current];

      if (isNil(currentData)) {
        return acc;
      }

      if (type === 'dynamiczone') {
        currentData.forEach(curr => {
          const compoSchema = get(components, curr.__component, {});

          acc += getDraftRelationsCount(curr, compoSchema);
        });
      }

      if (type === 'component') {
        const isRepeatable = get(schema, ['attributes', current, 'repeatable'], false);
        const compoUID = get(schema, ['attributes', current, 'component'], '');
        const compoSchema = get(components, compoUID, {});

        if (isRepeatable) {
          currentData.forEach(curr => {
            acc += getDraftRelationsCount(curr, compoSchema);
          });
        } else {
          acc += getDraftRelationsCount(currentData, compoSchema);
        }
      }

      if (type === 'relation' && !isMorph) {
        if (oneWayTypes.includes(relationType)) {
          const hasDraftAndPublish = has(currentData, 'publishedAt');

          if (hasDraftAndPublish && isEmpty(currentData.publishedAt)) {
            acc += 1;
          }
        } else {
          currentData.forEach(value => {
            if (has(value, 'publishedAt') && isEmpty(value.publishedAt)) {
              acc += 1;
            }
          });
        }
      }

      return acc;
    }, 0);

  const count = getDraftRelationsCount(data, ctSchema, components);

  return count;
};

export default getDraftRelations;
