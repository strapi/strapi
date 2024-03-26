import * as React from 'react';

import {
  Box,
  Button,
  Tag,
  MultiSelect,
  MultiSelectOption,
  MultiSelectProps,
  Popover,
  Flex,
} from '@strapi/design-system';
import { Cross, Filter } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import type { Categories, Collections, FilterTypes } from '../hooks/useMarketplaceData';
import type { NpmPackageType, MarketplacePageQuery } from '../MarketplacePage';

interface NpmPackagesFiltersProps {
  handleSelectClear: (type: FilterTypes) => void;
  handleSelectChange: (update: Partial<MarketplacePageQuery>) => void;
  npmPackageType: NpmPackageType;
  possibleCategories: Partial<Record<Categories, number>>;
  possibleCollections: Partial<Record<Collections, number>>;
  query: MarketplacePageQuery;
}

const NpmPackagesFilters = ({
  handleSelectClear,
  handleSelectChange,
  npmPackageType,
  possibleCategories,
  possibleCollections,
  query,
}: NpmPackagesFiltersProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null!);
  const { formatMessage } = useIntl();

  const handleToggle = () => setIsVisible((prev) => !prev);

  const handleTagRemove = (tagToRemove: string, filterType: FilterTypes) => {
    const update = {
      [filterType]: (query[filterType] ?? []).filter((previousTag) => previousTag !== tagToRemove),
    };

    handleSelectChange(update);
  };

  return (
    <>
      <Box paddingTop={1} paddingBottom={1}>
        <ButtonToggle
          variant="tertiary"
          ref={buttonRef}
          startIcon={<Filter />}
          onClick={handleToggle}
          size="S"
        >
          {formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
        </ButtonToggle>
        {isVisible && (
          <Popover source={buttonRef} onDismiss={handleToggle} padding={3} spacing={4}>
            <FiltersFlex direction="column" alignItems="stretch" gap={1}>
              <FilterSelect
                message={formatMessage({
                  id: 'admin.pages.MarketPlacePage.filters.collections',
                  defaultMessage: 'Collections',
                })}
                value={query?.collections || []}
                onChange={(newCollections) => {
                  const update = { collections: newCollections };
                  handleSelectChange(update);
                }}
                onClear={() => handleSelectClear('collections')}
                possibleFilters={possibleCollections}
                customizeContent={(values) =>
                  formatMessage(
                    {
                      id: 'admin.pages.MarketPlacePage.filters.collectionsSelected',
                      defaultMessage:
                        '{count, plural, =0 {No collections} one {# collection} other {# collections}} selected',
                    },
                    { count: values?.length ?? 0 }
                  )
                }
              />
              {npmPackageType === 'plugin' && (
                <FilterSelect
                  message={formatMessage({
                    id: 'admin.pages.MarketPlacePage.filters.categories',
                    defaultMessage: 'Categories',
                  })}
                  value={query?.categories || []}
                  onChange={(newCategories) => {
                    const update = { categories: newCategories };
                    handleSelectChange(update);
                  }}
                  onClear={() => handleSelectClear('categories')}
                  possibleFilters={possibleCategories}
                  customizeContent={(values) =>
                    formatMessage(
                      {
                        id: 'admin.pages.MarketPlacePage.filters.categoriesSelected',
                        defaultMessage:
                          '{count, plural, =0 {No categories} one {# category} other {# categories}} selected',
                      },
                      { count: values?.length ?? 0 }
                    )
                  }
                />
              )}
            </FiltersFlex>
          </Popover>
        )}
      </Box>
      {query.collections?.map((collection) => (
        <Box key={collection} padding={1}>
          <Tag icon={<Cross />} onClick={() => handleTagRemove(collection, 'collections')}>
            {collection}
          </Tag>
        </Box>
      ))}
      {npmPackageType === 'plugin' &&
        query.categories?.map((category) => (
          <Box key={category} padding={1}>
            <Tag icon={<Cross />} onClick={() => handleTagRemove(category, 'categories')}>
              {category}
            </Tag>
          </Box>
        ))}
    </>
  );
};

const ButtonToggle = styled(Button)`
  height: ${({ theme }) => theme.sizes.input.S};
`;

const FiltersFlex = styled(Flex)`
  /* Hide the label, every input needs a label. */
  label {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * FilterSelect
 * -----------------------------------------------------------------------------------------------*/

interface FilterSelectProps
  extends Pick<MultiSelectProps, 'customizeContent' | 'onClear' | 'onChange' | 'value'> {
  message: string;
  possibleFilters:
    | NpmPackagesFiltersProps['possibleCategories']
    | NpmPackagesFiltersProps['possibleCollections'];
}

const FilterSelect = ({
  message,
  value,
  onChange,
  possibleFilters,
  onClear,
  customizeContent,
}: FilterSelectProps) => {
  return (
    <MultiSelect
      data-testid={`${message}-button`}
      label={message}
      placeholder={message}
      size="M"
      onChange={onChange}
      onClear={onClear}
      value={value}
      customizeContent={customizeContent}
    >
      {Object.entries(possibleFilters).map(([filterName, count]) => {
        return (
          <MultiSelectOption
            data-testid={`${filterName}-${count}`}
            key={filterName}
            value={filterName}
          >
            {`${filterName} (${count})`}
          </MultiSelectOption>
        );
      })}
    </MultiSelect>
  );
};

export { NpmPackagesFilters };
export type { NpmPackagesFiltersProps };
