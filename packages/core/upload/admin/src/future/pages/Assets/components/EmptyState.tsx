import { Button, Flex, Typography } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';

interface EmptyStateProps {
  onAddAssets: () => void;
  /**
   * RBAC gate — without `assets.create` the "Add assets" CTA is hidden.
   * Required (not defaulted) so a permission gate can't silently regress to
   * permissive when a future call site forgets to pass it.
   */
  canAddAssets: boolean;
  searchQuery?: string;
  onClearSearch?: () => void;
}

/**
 * Empty state for the assets list (both views) when the current folder holds
 * no assets and no folders. The "Add assets" button opens the same file picker
 * as New > File upload; drag-and-drop upload keeps working since the page-wide
 * drop zone wraps this component.
 */
export const EmptyState = ({
  onAddAssets,
  canAddAssets,
  searchQuery,
  onClearSearch,
}: EmptyStateProps) => {
  const { formatMessage } = useIntl();
  const isSearchEmptyState = Boolean(searchQuery);

  return (
    <Flex direction="column" alignItems="center" gap={6} padding={11}>
      <EmptyDocuments width="16rem" height="8.8rem" />
      <Flex direction="column" alignItems="center" gap={2} textAlign="center">
        <Typography variant="delta" tag="p" fontWeight="bold" textColor="neutral800">
          {isSearchEmptyState
            ? formatMessage({
                id: getTranslationKey('list.search.empty.title'),
                defaultMessage: 'No results found',
              })
            : formatMessage({
                id: getTranslationKey('list.empty.title'),
                defaultMessage: 'No assets yet',
              })}
        </Typography>
        <Typography textColor="neutral600">
          {isSearchEmptyState
            ? formatMessage(
                {
                  id: getTranslationKey('list.search.empty.description'),
                  defaultMessage: 'No assets or folders match "{query}". Try a different search.',
                },
                { query: searchQuery }
              )
            : formatMessage({
                id: getTranslationKey('list.empty.description'),
                defaultMessage: 'Get started by uploading assets or creating a folder.',
              })}
        </Typography>
      </Flex>
      {isSearchEmptyState ? (
        // Same look as the filters empty state's "Clear filters" action.
        <Button variant="secondary" startIcon={<Cross aria-hidden />} onClick={onClearSearch}>
          {formatMessage({
            id: getTranslationKey('list.search.empty.clear'),
            defaultMessage: 'Clear search',
          })}
        </Button>
      ) : (
        canAddAssets && (
          <Button onClick={onAddAssets}>
            {formatMessage({
              id: getTranslationKey('list.empty.add-assets'),
              defaultMessage: 'Add assets',
            })}
          </Button>
        )
      )}
    </Flex>
  );
};

interface FilteredEmptyStateProps {
  onClearFilters: () => void;
}

/**
 * Empty state when active filters match nothing (including contradictory
 * badges — allowed by design). Distinct from the no-content state: the library
 * has items, the filters exclude them all.
 */
export const FilteredEmptyState = ({ onClearFilters }: FilteredEmptyStateProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="center" gap={6} padding={11}>
      <EmptyDocuments width="16rem" height="8.8rem" />
      <Typography textColor="neutral600">
        {formatMessage({
          id: getTranslationKey('list.filters.empty'),
          defaultMessage: 'No items matched current filters',
        })}
      </Typography>
      <Button variant="secondary" startIcon={<Cross aria-hidden />} onClick={onClearFilters}>
        {formatMessage({
          id: getTranslationKey('list.filters.clear'),
          defaultMessage: 'Clear filters',
        })}
      </Button>
    </Flex>
  );
};
