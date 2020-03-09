import React from 'react';
import PropTypes from 'prop-types';
import { some } from 'lodash';
import moment from 'moment';
import { FormattedMessage } from 'react-intl';
import { FilterIcon } from 'strapi-helper-plugin';

import FiltersCard from './FiltersCard';
import Picker from '../Picker';

const FiltersPicker = ({ onChange, filters }) => {
  const handleChange = ({ target: { value } }) => {
    let formattedValue = value;

    // moment format if datetime value
    if (value.value._isAMomentObject === true) {
      formattedValue.value = moment(value.value).format();
    }

    // Send updated filters
    if (!some(filters, formattedValue)) {
      onChange({ target: { name: 'filters', value } });
    }
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
  filters: [],
  onChange: () => {},
};

FiltersPicker.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      filter: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ),
  onChange: PropTypes.func,
};

export default FiltersPicker;
