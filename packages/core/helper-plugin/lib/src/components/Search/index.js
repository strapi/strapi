import React, { useEffect, useState } from 'react';
import { SearchIcon } from '@strapi/icons';
import { IconButton } from '@strapi/parts/IconButton';
import { TextInput } from '@strapi/parts/TextInput';
import useQueryParams from '../../hooks/useQueryParams';

const Search = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [{ query }, setQuery] = useQueryParams();
  const [value, setValue] = useState(query?._q || '');

  useEffect(() => {
    const handler = setTimeout(() => {
      if (value) {
        setQuery({ _q: value, page: 1 });
      } else {
        setQuery({ _q: '' }, 'remove');
      }
    }, 300);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  if (isOpen) {
    return (
      <TextInput
        onBlur={() => setIsOpen(false)}
        name="search"
        onChange={({ target: { value } }) => setValue(value)}
        type="text"
        value={value}
      />
    );
  }

  return <IconButton icon={<SearchIcon />} label="Search" onClick={handleToggle} />;
};

export default Search;
