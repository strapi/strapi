import * as React from 'react';

import { Button } from '@strapi/design-system';
import {
  FilterData,
  FilterListURLQuery,
  FilterPopoverURLQuery,
  useTracking,
} from '@strapi/helper-plugin';
import { Filter as FilterIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';

interface FilterProps {
  displayedFilters: FilterData[];
}

const Filter = ({ displayedFilters }: FilterProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const { formatMessage } = useIntl();
  const buttonRef = React.useRef<HTMLButtonElement>(null!);
  const { trackUsage } = useTracking();

  const handleToggle = () => {
    if (!isVisible) {
      trackUsage('willFilterEntries');
    }
    setIsVisible((prev) => !prev);
  };

  return (
    <>
      <Button
        variant="tertiary"
        ref={buttonRef}
        startIcon={<FilterIcon />}
        onClick={handleToggle}
        size="S"
      >
        {formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
      </Button>
      {isVisible && (
        <FilterPopoverURLQuery
          displayedFilters={displayedFilters}
          isVisible={isVisible}
          onToggle={handleToggle}
          source={buttonRef}
        />
      )}
      <FilterListURLQuery filtersSchema={displayedFilters} />
    </>
  );
};

export { Filter };
export type { FilterProps };
