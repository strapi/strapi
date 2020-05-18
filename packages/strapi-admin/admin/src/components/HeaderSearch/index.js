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
  const [value, setValue] = useState(query.get(queryParameter) || '');
  const { push } = useHistory();
  const displayedLabel = typeof label === 'object' ? formatMessage(label) : label;
  const capitalizedLabel = upperFirst(displayedLabel);

  useEffect(() => {
    const handler = setTimeout(() => {
      const currentSearch = query;

      if (value) {
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
