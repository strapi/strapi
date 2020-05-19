import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { upperFirst } from 'lodash';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useQuery } from 'strapi-helper-plugin';
import StyledHeaderSearch from './HeaderSearch';

const HeaderSearch = ({ label, queryParameter }) => {
  const { formatMessage } = useIntl();
  const query = useQuery();
  const searchValue = query.get(queryParameter) || '';
  const [value, setValue] = useState(searchValue);
  const { push } = useHistory();
  const displayedLabel = typeof label === 'object' ? formatMessage(label) : label;
  const capitalizedLabel = upperFirst(displayedLabel);

  useEffect(() => {
    if (searchValue === '') {
      // Synchronise the search
      handleClear();
    }
  }, [searchValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      let currentSearch = query;

      if (value) {
        // Create a new search in order to remove the filters
        currentSearch = new URLSearchParams('');

        // Keep the previous params _sort, _limit, _page
        currentSearch.set('_limit', query.get('_limit'));
        currentSearch.set('_page', query.get('_page'));
        currentSearch.set('_sort', query.get('_sort'));

        currentSearch.set(queryParameter, encodeURIComponent(value));
      } else {
        currentSearch.delete(queryParameter);
      }

      push({ search: currentSearch.toString() });
    }, 300);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = ({ target: { value } }) => {
    setValue(value);
  };

  const handleClear = () => {
    setValue('');
  };

  return (
    <StyledHeaderSearch
      label={capitalizedLabel}
      name={queryParameter}
      value={value}
      onChange={handleChange}
      onClear={handleClear}
    />
  );
};

HeaderSearch.defaultProps = {
  queryParameter: '_q',
};

HeaderSearch.propTypes = {
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.string.isRequired,
    }),
  ]).isRequired,
  queryParameter: PropTypes.string,
};

export default HeaderSearch;
