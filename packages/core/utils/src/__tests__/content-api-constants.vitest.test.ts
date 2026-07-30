import { describe, it, expect } from 'vitest';

import {
  ALLOWED_QUERY_PARAM_KEYS,
  RESERVED_INPUT_PARAM_KEYS,
  SHARED_QUERY_PARAM_KEYS,
} from '../content-api-constants';
import { constants } from '../content-types';

describe('content-api-constants', () => {
  it('SHARED_QUERY_PARAM_KEYS includes core query params', () => {
    expect(SHARED_QUERY_PARAM_KEYS).toEqual(
      expect.arrayContaining(['filters', 'sort', 'fields', 'populate', 'locale', 'status'])
    );
  });

  it('ALLOWED_QUERY_PARAM_KEYS extends shared keys with Content API-only params', () => {
    expect(ALLOWED_QUERY_PARAM_KEYS).toEqual(
      expect.arrayContaining([...SHARED_QUERY_PARAM_KEYS, 'pagination', 'count', 'ordering'])
    );
  });

  it('RESERVED_INPUT_PARAM_KEYS includes core document identifiers', () => {
    expect(RESERVED_INPUT_PARAM_KEYS).toEqual([constants.ID_ATTRIBUTE, constants.DOC_ID_ATTRIBUTE]);
  });
});
