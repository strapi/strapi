import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { FilterIcon } from 'strapi-helper-plugin';

import FiltersCard from './FiltersCard';
import Wrapper from './Wrapper';
import Picker from '../Picker';

import { getTrad } from '../../utils';
import formatFilter from './utils/formatFilter';

const FiltersPicker = ({ onChange }) => {
  const handleChange = ({ target: { value } }) => {
    onChange({ target: { name: 'filters', value: formatFilter(value) } });
  };

  return (
    <Wrapper>
      <Picker
        renderButtonContent={() => (
          <>
            <FilterIcon />
            <FormattedMessage id={getTrad('filter.name')} />
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
    </Wrapper>
  );
};

FiltersPicker.defaultProps = {
  onChange: () => {},
};

FiltersPicker.propTypes = {
  onChange: PropTypes.func,
};

export default FiltersPicker;
