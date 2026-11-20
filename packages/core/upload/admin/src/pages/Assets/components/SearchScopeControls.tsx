import { useId } from 'react';

import { Flex, Switch, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';

interface SearchScopeControlsProps {
  canSearchAll: boolean;
  isSearchingAll: boolean;
  onSearchingAllChange: (value: boolean) => void;
  resultCount: number;
}

export const SearchScopeControls = ({
  canSearchAll,
  isSearchingAll,
  onSearchingAllChange,
  resultCount,
}: SearchScopeControlsProps) => {
  const { formatMessage } = useIntl();
  const switchId = useId();

  return (
    <Flex gap={3} alignItems="center" shrink={0}>
      {canSearchAll && (
        <Flex gap={2} alignItems="center">
          <Switch id={switchId} checked={isSearchingAll} onCheckedChange={onSearchingAllChange} />
          <Typography tag="label" htmlFor={switchId} variant="omega" textColor="neutral800">
            {formatMessage({
              id: getTranslationKey('search.all-media'),
              defaultMessage: 'Search all media',
            })}
          </Typography>
        </Flex>
      )}
      <Typography role="status" variant="omega" textColor="neutral600">
        {formatMessage(
          {
            id: getTranslationKey('search.results-count'),
            defaultMessage: '{count, plural, one {# result} other {# results}}',
          },
          { count: resultCount }
        )}
      </Typography>
    </Flex>
  );
};
