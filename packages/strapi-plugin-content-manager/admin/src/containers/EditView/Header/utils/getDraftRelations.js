import { get, has, isEmpty } from 'lodash';

const getDraftRelations = (data, ctSchema, components) => {
  const getDraftRelationsCount = (data, schema) =>
    Object.keys(data).reduce((acc, current) => {
      const type = get(schema, ['schema', 'attributes', current, 'type'], 'string');
      const relationType = get(schema, ['schema', 'attributes', current, 'relationType'], '');
      const isMorph = relationType.toLowerCase().includes('morph');
      const oneWayTypes = ['oneWay', 'oneToOne', 'manyToOne'];
      const currentData = data[current];

      if (type === 'dynamiczone') {
        const dzDraftCount = currentData.reduce((acc2, curr) => {
          const compoSchema = get(components, curr.__component, {});

          acc2 += getDraftRelationsCount(curr, compoSchema);

          return acc2;
        }, 0);

        acc += dzDraftCount;
      }

      if (type === 'component') {
        const isRepeatable = get(schema, ['schema', 'attributes', current, 'repeatable'], false);
        const compoUID = get(schema, ['schema', 'attributes', current, 'component'], '');
        const compoSchema = get(components, compoUID, {});

        if (isRepeatable) {
          const compoCount = currentData.reduce((acc2, curr) => {
            acc2 += getDraftRelationsCount(curr, compoSchema);

            return acc2;
          }, 0);

          acc += compoCount;
        } else {
          acc += getDraftRelationsCount(currentData, compoSchema);
        }
      }

      if (type === 'relation' && !isMorph) {
        if (oneWayTypes.includes(relationType)) {
          const hasDraftAndPublish = has(currentData, 'published_at');

          if (hasDraftAndPublish && isEmpty(currentData.published_at)) {
            acc += 1;
          }
        } else {
          const hasDraftAndPublish = currentData.some(value => has(value, 'published_at'));

          if (hasDraftAndPublish) {
            const count = currentData.reduce((acc, current) => {
              if (isEmpty(current.published_at)) {
                acc += 1;
              }

              return acc;
            }, 0);

            acc += count;
          }
        }
      }

      return acc;
    }, 0);

  const count = getDraftRelationsCount(data, ctSchema, components);

  return count;
};

export default getDraftRelations;
