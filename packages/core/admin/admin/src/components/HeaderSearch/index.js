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
  const displayedLabel =
    typeof label === 'object'
      ? formatMessage({ ...label, defaultMessage: label.defaultMessage || label.id })
      : label;
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

        // Keep the previous params _sort, pageSize, page
        const pageSize = query.get('pageSize');
        const page = query.get('page');
        const _sort = query.get('_sort');

        if (page) {
          currentSearch.set('page', page);
        }

        if (pageSize) {
          currentSearch.set('pageSize', pageSize);
        }

        if (_sort) {
          currentSearch.set('_sort', _sort);
        }

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
      defaultMessage: PropTypes.string,
    }),
  ]).isRequired,
  queryParameter: PropTypes.string,
};

export default HeaderSearch;
