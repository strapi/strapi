import type { OpenAPIV3_1 } from 'openapi-types';

import {
  hasExpandableObjectProperties,
  shouldUseDeepObjectStyle,
} from '../src/assemblers/document/query-param-styles';

describe('query param styles', () => {
  it('does not treat filters as bracket-expandable', () => {
    const filtersSchema: OpenAPIV3_1.SchemaObject = {
      type: 'object',
      additionalProperties: true,
    };

    expect(hasExpandableObjectProperties(filtersSchema)).toBe(false);
    expect(shouldUseDeepObjectStyle('filters', filtersSchema)).toBe(true);
  });
});
