import { REVIEW_WORKFLOW_FILTERS } from '../../routes/content-manager/model/constants';
import { addColumnToTableHook, addFilterToListViewHook } from '../cm-hooks';

const baseLayout = {
  layout: [],
  settings: {},
  metadatas: {},
} as any;

describe('cm-hooks', () => {
  describe('addColumnToTableHook', () => {
    it('returns headers unchanged when reviewWorkflows is not enabled', () => {
      const layout = { ...baseLayout, options: { reviewWorkflows: false } };
      const headers = [{ name: 'title' }] as any;

      const result = addColumnToTableHook({ displayedHeaders: headers, layout });

      expect(result.displayedHeaders).toBe(headers);
    });

    it('appends review-workflow columns when reviewWorkflows is enabled', () => {
      const layout = { ...baseLayout, options: { reviewWorkflows: true } };
      const headers = [{ name: 'title' }] as any;

      const result = addColumnToTableHook({ displayedHeaders: headers, layout });

      expect(result.displayedHeaders).toHaveLength(headers.length + 2);
      expect(result.displayedHeaders.map((h: any) => h.name)).toEqual(
        expect.arrayContaining(['strapi_stage', 'strapi_assignee'])
      );
    });
  });

  describe('addFilterToListViewHook', () => {
    it('returns filters unchanged when reviewWorkflows is not enabled', () => {
      const layout = { ...baseLayout, options: { reviewWorkflows: false } };
      const filters = [{ name: 'title' }] as any;

      const result = addFilterToListViewHook({ displayedFilters: filters, layout });

      expect(result.displayedFilters).toBe(filters);
    });

    it('returns filters unchanged when layout.options is missing', () => {
      const layout = { ...baseLayout, options: undefined };
      const filters = [{ name: 'title' }] as any;

      const result = addFilterToListViewHook({ displayedFilters: filters, layout });

      expect(result.displayedFilters).toBe(filters);
    });

    it('appends review-workflow filters (stage + assignee) when reviewWorkflows is enabled', () => {
      const layout = { ...baseLayout, options: { reviewWorkflows: true } };
      const filters = [{ name: 'title' }] as any;

      const result = addFilterToListViewHook({ displayedFilters: filters, layout });

      expect(result.displayedFilters).toHaveLength(filters.length + REVIEW_WORKFLOW_FILTERS.length);
      expect(result.displayedFilters.map((f: any) => f.name)).toEqual(
        expect.arrayContaining(['strapi_stage', 'strapi_assignee'])
      );
    });

    it('does not mutate the input array', () => {
      const layout = { ...baseLayout, options: { reviewWorkflows: true } };
      const filters = [{ name: 'title' }] as any;
      const originalLength = filters.length;

      addFilterToListViewHook({ displayedFilters: filters, layout });

      expect(filters).toHaveLength(originalLength);
    });
  });
});
