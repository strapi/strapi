import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { FilterIcon } from 'strapi-helper-plugin';

import FiltersCard from './FiltersCard';
import Picker from '../Picker';

const FiltersPicker = ({ onChange, filters }) => {
  const handleChange = ({ target: { value } }) => {
    onChange({ target: { name: 'filters', value } });
  };

  return (
    <Picker
      renderButtonContent={() => (
        <>
          <FilterIcon />
          <FormattedMessage id="app.utils.filters" />
        </>
      )}
      renderSectionContent={onToggle => (
        <FiltersCard
          filters={filters}
          onChange={e => {
            handleChange(e);
            onToggle();
          }}
        />
      )}
    />
  );
};

FiltersPicker.defaultProps = {
  filters: [],
  onChange: () => {},
};

FiltersPicker.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.object),
  onChange: PropTypes.func,
};

export default FiltersPicker;
