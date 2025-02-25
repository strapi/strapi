import { sortContentType } from '../cleanData';

import { expectedData } from './expectedFormattedData';
import { data as rawData } from './rawData';

describe('CleanData utils', () => {
  describe('sortContentType', () => {
    it('should return sorted collection types array', () => {
      const { sortedContentTypes } = expectedData;
      const {
        rawData: { contentTypesToSort },
      } = rawData;

      expect(sortContentType(contentTypesToSort)).toEqual(sortedContentTypes);
    });

    it('should return an empty array if no content types', () => {
      expect(sortContentType({})).toEqual([]);
    });
  });
});
