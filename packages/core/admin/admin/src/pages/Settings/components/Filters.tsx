import * as React from 'react';

import { Box, Button } from '@strapi/design-system';
import {
  FilterListURLQuery,
  FilterPopoverURLQuery,
  FilterPopoverURLQueryProps,
} from '@strapi/helper-plugin';
import { Filter } from '@strapi/icons';
import { useIntl } from 'react-intl';

interface FitlersProps extends Pick<FilterPopoverURLQueryProps, 'displayedFilters'> {}

const Filters = ({ displayedFilters }: FitlersProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const { formatMessage } = useIntl();
  const buttonRef = React.useRef<HTMLButtonElement>(null!);
  const handleToggle = () => {
    setIsVisible((prev) => !prev);
  };

  return (
    <>
      <Box paddingTop={1} paddingBottom={1}>
        <Button
          variant="tertiary"
          ref={buttonRef}
          startIcon={<Filter />}
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
      </Box>
      <FilterListURLQuery filtersSchema={displayedFilters} />
    </>
  );
};

export { Filters, FitlersProps };
