import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ schema, key, value }, { set }) => {
  if (key === '' && value === '*') {
    const { attributes } = schema;

    const newPopulateQuery = Object.entries(attributes)
      .filter(([, attribute]) =>
        ['relation', 'component', 'media', 'dynamiczone'].includes(attribute.type)
      )
      .reduce<Record<string, true>>((acc, [key]) => ({ ...acc, [key]: true }), {});

    set('', newPopulateQuery);
  }
};

export default visitor;
