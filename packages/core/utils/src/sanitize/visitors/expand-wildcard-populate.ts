import { isMorphToRelationalAttribute } from '../../content-types';
import type { Visitor } from '../../traverse/factory';

const visitor: Visitor = ({ schema, key, value }, { set }) => {
  if (key === '' && value === '*') {
    const { attributes } = schema;

    const newPopulateQuery = Object.entries(attributes)
      .filter(([, attribute]) => {
        // Include relation, component, media, and dynamiczone attributes
        if (!['relation', 'component', 'media', 'dynamiczone'].includes(attribute.type)) {
          return false;
        }
        // Exclude morphTo relations as they cannot be populated without fragments
        if (isMorphToRelationalAttribute(attribute)) {
          return false;
        }
        return true;
      })
      .reduce<Record<string, true>>((acc, [key]) => ({ ...acc, [key]: true }), {});

    set('', newPopulateQuery);
  }
};

export default visitor;
