import { Box, SingleSelectOption, SingleSelect, BoxComponent } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

const SORT_TYPES = {
  'name:asc': {
    selected: {
      id: 'admin.pages.MarketPlacePage.sort.alphabetical.selected',
      defaultMessage: 'Sort by alphabetical order',
    },
    option: {
      id: 'admin.pages.MarketPlacePage.sort.alphabetical',
      defaultMessage: 'Alphabetical order',
    },
  },
  'submissionDate:desc': {
    selected: {
      id: 'admin.pages.MarketPlacePage.sort.newest.selected',
      defaultMessage: 'Sort by newest',
    },
    option: {
      id: 'admin.pages.MarketPlacePage.sort.newest',
      defaultMessage: 'Newest',
    },
  },
  'githubStars:desc': {
    selected: {
      id: 'admin.pages.MarketPlacePage.sort.githubStars.selected',
      defaultMessage: 'Sort by GitHub stars',
    },
    option: {
      id: 'admin.pages.MarketPlacePage.sort.githubStars',
      defaultMessage: 'Number of GitHub stars',
    },
  },
  'npmDownloads:desc': {
    selected: {
      id: 'admin.pages.MarketPlacePage.sort.npmDownloads.selected',
      defaultMessage: 'Sort by npm downloads',
    },
    option: {
      id: 'admin.pages.MarketPlacePage.sort.npmDownloads',
      defaultMessage: 'Number of downloads',
    },
  },
} as const;

interface SortSelectProps {
  sortQuery: keyof typeof SORT_TYPES;
  handleSelectChange: (payload: { sort: string }) => void;
}

const SortSelect = ({ sortQuery, handleSelectChange }: SortSelectProps) => {
  const { formatMessage } = useIntl();

  return (
    <SelectWrapper>
      <SingleSelect
        value={sortQuery}
        customizeContent={() => formatMessage(SORT_TYPES[sortQuery].selected)}
        onChange={(sortName) => {
          // @ts-expect-error – in V2 design-system we'll only ever return strings.
          handleSelectChange({ sort: sortName });
        }}
        aria-label={formatMessage({
          id: 'admin.pages.MarketPlacePage.sort.label',
          defaultMessage: 'Sort by',
        })}
        size="S"
      >
        {Object.entries(SORT_TYPES).map(([sortName, messages]) => {
          return (
            <SingleSelectOption key={sortName} value={sortName}>
              {formatMessage(messages.option)}
            </SingleSelectOption>
          );
        })}
      </SingleSelect>
    </SelectWrapper>
  );
};

const SelectWrapper = styled<BoxComponent>(Box)`
  font-weight: ${({ theme }) => theme.fontWeights.semiBold};

  span {
    font-size: ${({ theme }) => theme.fontSizes[1]};
  }
`;

export { SortSelect };
export type { SortSelectProps };
