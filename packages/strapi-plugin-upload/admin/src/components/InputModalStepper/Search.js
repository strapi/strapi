import React, { useState, useEffect, memo } from 'react';
import styled from 'styled-components';
import { useDebounce } from '@buffetjs/hooks';
import { HeaderSearch as BaseHeaderSearch, useGlobalContext } from 'strapi-helper-plugin';

import getTrad from '../../utils/getTrad';
import useModalContext from '../../hooks/useModalContext';

const HeaderSearch = styled(BaseHeaderSearch)`
  position: relative;
  background-color: transparent;
  border-right: none;
`;

const Search = () => {
  const [value, setValue] = useState('');
  const { setParam } = useModalContext();
  const { formatMessage } = useGlobalContext();
  const pluginName = formatMessage({ id: getTrad('plugin.name') });
  const debouncedSearch = useDebounce(value, 300);

  useEffect(() => {
    setParam({ name: '_q', value: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleSearchChange = e => {
    setValue(e.target.value);
  };

  const handleClear = () => {
    setValue('');
  };

  return (
    <HeaderSearch
      label={pluginName}
      onChange={handleSearchChange}
      onClear={handleClear}
      placeholder={formatMessage({ id: getTrad('search.placeholder') })}
      name="_q"
      value={value}
    />
  );
};

export default memo(Search);
