import React, { useState, useEffect, memo } from 'react';
import { useDebounce } from '@buffetjs/hooks';
import { useGlobalContext } from 'strapi-helper-plugin';

import getTrad from '../../utils/getTrad';
import useModalContext from '../../hooks/useModalContext';
import HeaderSearch from './HeaderSearch';

const Search = () => {
  const [value, setValue] = useState('');
  const {
    allowedActions: { canRead },
    setParam,
  } = useModalContext();
  const { formatMessage } = useGlobalContext();
  const debouncedSearch = useDebounce(value, 300);

  useEffect(() => {
    if (canRead) {
      setParam({ name: '_q', value: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, canRead]);

  const handleSearchChange = e => {
    setValue(e.target.value);
  };

  const handleClear = () => {
    setValue('');
  };

  if (!canRead) {
    return null;
  }

  return (
    <HeaderSearch
      onChange={handleSearchChange}
      onClear={handleClear}
      placeholder={formatMessage({ id: getTrad('search.placeholder') })}
      name="_q"
      value={value}
    />
  );
};

export default memo(Search);
