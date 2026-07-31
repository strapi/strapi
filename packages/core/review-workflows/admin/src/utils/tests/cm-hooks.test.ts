import { REVIEW_WORKFLOW_FILTERS } from '../../routes/content-manager/model/constants';
import { addColumnToTableHook, addFilterToListViewHook } from '../cm-hooks';

import type {
  InjectableListViewFilter,
  ListFieldLayout,
  ListLayout,
} from '@strapi/content-manager/strapi-admin';

type ReviewWorkflowsListLayout = ListLayout & {
  options: ListLayout['options'] & {
    reviewWorkflows?: boolean;
  };
};

const baseLayout = {
  layout: [],
  settings: {},
  metadatas: {},
  options: {},
} as unknown as ReviewWorkflowsListLayout;

describe('cm-hooks', () => {
  describe('addColumnToTableHook', () => {
    it('returns headers unchanged when reviewWorkflows is not enabled', () => {
      const layout = { ...baseLayout, options: { reviewWorkflows: false } };
      const headers = [{ name: 'title' }] as unknown as ListFieldLayout[];

      const result = addColumnToTableHook({ displayedHeaders: headers, layout });

      expect(result.displayedHeaders).toBe(headers);
    });

    it('appends review-workflow columns when reviewWorkflows is enabled', () => {
      const layout = { ...baseLayout, options: { reviewWorkflows: true } };
      const headers = [{ name: 'title' }] as unknown as ListFieldLayout[];

      const result = addColumnToTableHook({ displayedHeaders: headers, layout });

      expect(result.displayedHeaders).toHaveLength(headers.length + 2);
      expect(result.displayedHeaders.map((header) => header.name)).toEqual(
        expect.arrayContaining(['strapi_stage', 'strapi_assignee'])
      );
    });
  });

  describe('addFilterToListViewHook', () => {
    it('returns filters unchanged when reviewWorkflows is not enabled', () => {
      const layout = { ...baseLayout, options: { reviewWorkflows: false } };
      const filters = [{ name: 'title' }] as unknown as InjectableListViewFilter[];

      const result = addFilterToListViewHook({ displayedFilters: filters, layout });

      expect(result.displayedFilters).toBe(filters);
    });

    it('returns filters unchanged when layout.options is missing', () => {
      const layout = { ...baseLayout, options: undefined } as unknown as ReviewWorkflowsListLayout;
      const filters = [{ name: 'title' }] as unknown as InjectableListViewFilter[];

      const result = addFilterToListViewHook({ displayedFilters: filters, layout });

      expect(result.displayedFilters).toBe(filters);
    });

    it('appends review-workflow filters (stage + assignee) when reviewWorkflows is enabled', () => {
      const layout = { ...baseLayout, options: { reviewWorkflows: true } };
      const filters = [{ name: 'title' }] as unknown as InjectableListViewFilter[];

      const result = addFilterToListViewHook({ displayedFilters: filters, layout });

      expect(result.displayedFilters).toHaveLength(filters.length + REVIEW_WORKFLOW_FILTERS.length);
      expect(result.displayedFilters.map((filter) => filter.name)).toEqual(
        expect.arrayContaining(['strapi_stage', 'strapi_assignee'])
      );
    });

    it('does not mutate the input array', () => {
      const layout = { ...baseLayout, options: { reviewWorkflows: true } };
      const filters = [{ name: 'title' }] as unknown as InjectableListViewFilter[];
      const originalLength = filters.length;

      addFilterToListViewHook({ displayedFilters: filters, layout });

      expect(filters).toHaveLength(originalLength);
    });
  });
});
