import { Box, SingleSelectOption, SingleSelect } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

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
        size="S"
        id="sort-by-select"
        value={sortQuery}
        customizeContent={() => formatMessage(SORT_TYPES[sortQuery].selected)}
        onChange={(sortName) => {
          // @ts-expect-error – in V2 design-system we'll only ever return strings.
          handleSelectChange({ sort: sortName });
        }}
        label={formatMessage({
          id: 'admin.pages.MarketPlacePage.sort.label',
          defaultMessage: 'Sort by',
        })}
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

const SelectWrapper = styled(Box)`
  font-weight: ${({ theme }) => theme.fontWeights.semiBold};

  span {
    font-size: ${({ theme }) => theme.fontSizes[1]};
  }

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

export { SortSelect };
export type { SortSelectProps };
