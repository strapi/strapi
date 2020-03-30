import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { FilterIcon } from 'strapi-helper-plugin';

import FiltersCard from './FiltersCard';
import Picker from '../Picker';

const FiltersPicker = ({ onChange }) => {
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
  onChange: () => {},
};

FiltersPicker.propTypes = {
  onChange: PropTypes.func,
};

export default FiltersPicker;
