import { Button, Flex, Typography } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';

interface EmptyStateProps {
  onAddAssets: () => void;
}

/**
 * Empty state for the assets list (both views) when the current folder holds
 * no assets and no folders. The "Add assets" button opens the same file picker
 * as New > File upload; drag-and-drop upload keeps working since the page-wide
 * drop zone wraps this component.
 */
export const EmptyState = ({ onAddAssets }: EmptyStateProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="center" gap={6} padding={11}>
      <EmptyDocuments width="16rem" height="8.8rem" />
      <Flex direction="column" alignItems="center" gap={2} textAlign="center">
        <Typography variant="delta" tag="p" fontWeight="bold" textColor="neutral800">
          {formatMessage({
            id: getTranslationKey('list.empty.title'),
            defaultMessage: 'No assets yet',
          })}
        </Typography>
        <Typography textColor="neutral600">
          {formatMessage({
            id: getTranslationKey('list.empty.description'),
            defaultMessage: 'Get started by uploading assets or creating a folder.',
          })}
        </Typography>
      </Flex>
      <Button onClick={onAddAssets}>
        {formatMessage({
          id: getTranslationKey('list.empty.add-assets'),
          defaultMessage: 'Add assets',
        })}
      </Button>
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
